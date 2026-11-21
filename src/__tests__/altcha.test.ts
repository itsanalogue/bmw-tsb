import * as crypto from 'crypto';
import { expect, test } from 'vitest';
import {
  type AltchaChallenge,
  encodeAltchaPayload,
  getAltchaChallengeUrl,
  isAltchaVerificationPage,
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
