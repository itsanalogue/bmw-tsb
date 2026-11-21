import * as crypto from 'crypto';
import { expect, test } from 'vitest';
import {
  type AltchaChallenge,
  encodeAltchaPayload,
  getAltchaChallengeUrl,
  isAltchaVerificationPage,
  resolveSetCookies,
  solveAltchaChallenge,
} from '../altcha.js';

// Build a challenge the way altcha-lib v2 does in deterministic mode: derive
// the key for a secret counter and publish the first half as keyPrefix.
const makeChallenge = (counter: number): AltchaChallenge => {
  const nonce = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16);
  const password = Buffer.alloc(nonce.length + 4);
  nonce.copy(password);
  password.writeUInt32BE(counter, nonce.length);
  const key = crypto.argon2Sync('argon2id', {
    message: password,
    nonce: salt,
    parallelism: 1,
    memory: 6840,
    passes: 1,
    tagLength: 32,
  });
  return {
    parameters: {
      algorithm: 'ARGON2ID',
      nonce: nonce.toString('hex'),
      salt: salt.toString('hex'),
      cost: 1,
      keyLength: 32,
      keyPrefix: key.subarray(0, 16).toString('hex'),
      keySignature: null,
      memoryCost: 6840,
      parallelism: 1,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
      data: null,
    },
    signature: 'abc123',
  };
};

test('solveAltchaChallenge finds the counter behind an ARGON2ID challenge', async () => {
  const challenge = makeChallenge(9);
  const solution = await solveAltchaChallenge(challenge);
  expect(solution.counter).toBe(9);
  expect(solution.derivedKey.startsWith(challenge.parameters.keyPrefix)).toBe(
    true,
  );

  const payload = JSON.parse(
    Buffer.from(encodeAltchaPayload(challenge, solution), 'base64').toString(),
  ) as unknown;
  expect(payload).toEqual({
    challenge: {
      parameters: challenge.parameters,
      signature: challenge.signature,
    },
    solution,
  });
});

test('getAltchaChallengeUrl resolves the widget challenge attribute', () => {
  const page = `<altcha-widget
            id="altcha-worker"
            challenge="?altcha_get_challenge=1"
            hideLogo>
    </altcha-widget>`;
  expect(isAltchaVerificationPage(page)).toBe(true);
  expect(isAltchaVerificationPage('<html>login</html>')).toBe(false);
  expect(
    getAltchaChallengeUrl(page, 'https://g45.bimmerpost.com/forums/login.php'),
  ).toBe('https://g45.bimmerpost.com/forums/login.php?altcha_get_challenge=1');
});

test('resolveSetCookies keeps one value per name like a browser jar', () => {
  expect(
    resolveSetCookies([
      'human_verify=deleted; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/',
      'human_verify=abc; expires=Fri, 01 Jan 2100 00:00:00 GMT; path=/; domain=.bimmerpost.com',
    ]),
  ).toEqual(['human_verify=abc']);
  expect(
    resolveSetCookies([
      'human_verify=first; path=/',
      'human_verify=second; path=/; domain=.bimmerpost.com',
    ]),
  ).toEqual(['human_verify=second']);
  expect(
    resolveSetCookies(['human_verify=abc; path=/', 'human_verify=; Max-Age=0']),
  ).toEqual([]);
});
