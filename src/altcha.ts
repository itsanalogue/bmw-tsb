import fs from 'fs';
import * as crypto from 'crypto';
import { promisify } from 'util';
import log from './log.js';
import { getOutputPath } from './output.js';

/**
 * Headless solver for the ALTCHA (v2) proof-of-work verification page that the
 * forum serves in place of normal pages. It does what the page's
 * <altcha-widget> does in a browser:
 *
 *  1. GET the challenge from the widget's `challenge` URL.
 *  2. Brute-force counters until argon2id(nonce + counter, salt) starts with
 *     the challenge's keyPrefix.
 *  3. POST `altcha_payload=<base64 JSON>` back to the page URL. The server
 *     replies `{ status: 'verified' }` and sets the human verification cookie.
 *
 * Mirrors altcha-lib v2 `solveChallenge` and the altcha widget payload format.
 */

export interface AltchaChallenge {
  parameters: {
    algorithm: string;
    nonce: string;
    salt: string;
    cost: number;
    keyLength?: number;
    keyPrefix: string;
    memoryCost?: number;
    parallelism?: number;
    expiresAt?: number;
    [key: string]: unknown;
  };
  signature?: string;
  /** `_version: 1` challenges encode the counter as a string, not a uint32. */
  _version?: number;
}

export interface AltchaSolution {
  counter: number;
  derivedKey: string;
  time: number;
}

const argon2 = promisify(crypto.argon2);

const FETCH_TIMEOUT_MS = 30_000;

const ALTCHA_WIDGET_PATTERN = /<altcha-widget\b[^>]*>/i;

export const isAltchaVerificationPage = (pageText: string) =>
  ALTCHA_WIDGET_PATTERN.test(pageText);

/** Resolve the widget's `challenge` attribute against the page URL. */
export const getAltchaChallengeUrl = (pageText: string, pageUrl: string) => {
  const widget = ALTCHA_WIDGET_PATTERN.exec(pageText)?.[0] ?? '';
  const challengeAttr = /\bchallenge="([^"]+)"/i.exec(widget)?.[1];
  return new URL(
    (challengeAttr ?? '?altcha_get_challenge=1').replace(/&amp;/g, '&'),
    pageUrl,
  ).toString();
};

const buildPassword = (
  nonce: Buffer,
  counter: number,
  counterMode: 'uint32' | 'string',
) => {
  if (counterMode === 'string') {
    return Buffer.concat([nonce, Buffer.from(counter.toString(), 'utf8')]);
  }
  const password = Buffer.alloc(nonce.length + 4);
  nonce.copy(password);
  password.writeUInt32BE(counter, nonce.length);
  return password;
};

export async function solveAltchaChallenge(
  challenge: AltchaChallenge,
  { timeoutMs = 120_000, concurrency = 4 } = {},
): Promise<AltchaSolution> {
  const p = challenge.parameters;
  if (p.algorithm !== 'ARGON2ID') {
    throw new Error(`Unsupported altcha algorithm ${p.algorithm}.`);
  }
  if (!p.memoryCost || !/^[0-9a-f]+$/i.test(p.keyPrefix)) {
    throw new Error(
      `Invalid altcha challenge parameters: ${JSON.stringify(p)}`,
    );
  }
  const counterMode = challenge._version === 1 ? 'string' : 'uint32';
  const nonce = Buffer.from(p.nonce, 'hex');
  const salt = Buffer.from(p.salt, 'hex');
  const keyPrefix = p.keyPrefix.toLowerCase();
  const deriveKey = (counter: number) =>
    argon2('argon2id', {
      message: buildPassword(nonce, counter, counterMode),
      nonce: salt,
      parallelism: p.parallelism || 1,
      memory: p.memoryCost!,
      passes: p.cost,
      tagLength: p.keyLength ?? 32,
    });

  log.info(
    `Solving altcha challenge (${p.algorithm}, memoryCost ${p.memoryCost}, cost ${p.cost}, counter mode ${counterMode}).`,
  );
  const start = performance.now();
  let lastProgress = start;
  // Derive a batch of counters at once; node's argon2 runs on the libuv
  // thread pool, so this uses several cores like the widget's web workers.
  for (let base = 0; base <= 0xffffffff; base += concurrency) {
    if (performance.now() - start > timeoutMs) {
      throw new Error(
        `Timed out solving altcha challenge after ${base} attempts (${timeoutMs}ms).`,
      );
    }
    if (performance.now() - lastProgress > 10_000) {
      lastProgress = performance.now();
      log.info(
        `Still solving altcha challenge: ${base} attempts in ${Math.round((lastProgress - start) / 1000)}s.`,
      );
    }
    const counters = Array.from({ length: concurrency }, (_, i) => base + i);
    const keys = await Promise.all(counters.map(deriveKey));
    const match = keys.findIndex((key) =>
      key.toString('hex').startsWith(keyPrefix),
    );
    if (match >= 0) {
      return {
        counter: counters[match],
        derivedKey: keys[match].toString('hex'),
        time: Math.floor((performance.now() - start) * 10) / 10,
      };
    }
  }
  throw new Error('Exhausted altcha counter space without a solution.');
}

/** The widget's payload: base64 of `{ challenge: { parameters, signature }, solution }`. */
export const encodeAltchaPayload = (
  challenge: AltchaChallenge,
  solution: AltchaSolution,
) =>
  Buffer.from(
    JSON.stringify({
      challenge: {
        parameters: challenge.parameters,
        signature: challenge.signature,
      },
      solution,
    }),
  ).toString('base64');

const cookiePair = (setCookie: string) => setCookie.split(';')[0].trim();
const cookieName = (setCookie: string) => cookiePair(setCookie).split('=')[0];

/**
 * Solve the altcha verification page at `pageUrl` and return the cookies
 * (`name=value`) the server set on success, to send with later requests.
 * Writes a diagnostic summary (no cookie values) to out/altcha-verification.json.
 */
export async function passAltchaVerification({
  pageUrl,
  pageText,
  userAgent,
  cookie,
}: {
  pageUrl: string;
  pageText: string;
  userAgent: string;
  cookie: string;
}): Promise<string[]> {
  const challengeUrl = getAltchaChallengeUrl(pageText, pageUrl);
  const diagnostics: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    pageUrl,
    challengeUrl,
  };
  const writeDiagnostics = async () => {
    try {
      await fs.promises.mkdir(getOutputPath(''), { recursive: true });
      await fs.promises.writeFile(
        getOutputPath('altcha-verification.json'),
        JSON.stringify(diagnostics, null, 2),
      );
    } catch (error) {
      log.warn(
        `Failed to write altcha diagnostics: ${(error as Error).message}`,
      );
    }
  };

  try {
    log.info(`Fetching altcha challenge ${challengeUrl}`);
    const challengeRes = await fetch(challengeUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
        Referer: pageUrl,
        Cookie: cookie,
      },
    });
    const challengeText = await challengeRes.text();
    diagnostics.challengeStatus = challengeRes.status;
    if (!challengeRes.ok) {
      diagnostics.challengeBody = challengeText;
      throw new Error(
        `Failed to fetch altcha challenge ${challengeUrl}: ${challengeRes.status}`,
      );
    }
    const challenge = JSON.parse(challengeText) as AltchaChallenge;
    diagnostics.challenge = challenge;

    const solution = await solveAltchaChallenge(challenge);
    diagnostics.solution = solution;
    log.info(
      `Solved altcha challenge (counter ${solution.counter}) in ${Math.round(solution.time)}ms.`,
    );

    // redirect: 'manual' so cookies set on a redirect response aren't lost.
    log.info(`Submitting altcha solution to ${pageUrl}`);
    const verifyRes = await fetch(pageUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      method: 'POST',
      redirect: 'manual',
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Origin: new URL(pageUrl).origin,
        Referer: pageUrl,
        Cookie: cookie,
      },
      body: `altcha_payload=${encodeURIComponent(encodeAltchaPayload(challenge, solution))}`,
    });
    const verifyText = await verifyRes.text();
    const setCookies = verifyRes.headers.getSetCookie();
    diagnostics.verifyStatus = verifyRes.status;
    diagnostics.verifyLocation = verifyRes.headers.get('location');
    diagnostics.verifySetCookieNames = setCookies.map(cookieName);
    diagnostics.verifyBody = verifyText.slice(0, 2000);
    log.info(
      `Altcha verification response: ${verifyRes.status} ${verifyText.slice(0, 200)}`,
    );

    let verified = false;
    try {
      verified =
        (JSON.parse(verifyText) as { status?: string }).status === 'verified';
    } catch {
      // A redirect (handled by the widget as success) has no JSON body.
      verified = verifyRes.status >= 300 && verifyRes.status < 400;
    }
    if (!verified) {
      throw new Error(
        `Altcha verification was not accepted (status: ${verifyRes.status}): ${verifyText.slice(0, 500)}`,
      );
    }
    log.info(
      `Passed altcha verification; received cookies: ${setCookies.map(cookieName).join(', ') || '(none)'}`,
    );
    return setCookies.map(cookiePair);
  } catch (error) {
    diagnostics.error = (error as Error).message;
    log.warn(
      `Altcha verification failed: ${(error as Error).message} (details in altcha-verification.json)`,
    );
    throw error;
  } finally {
    await writeDiagnostics();
  }
}
