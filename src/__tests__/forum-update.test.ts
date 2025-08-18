import fs from 'fs';
import { expect, test } from 'vitest';
import { encodeContentForVbulletin } from '../forum-update';

test('creates proper encoding for vBulletin quirks', () => {
  const raw = fs.readFileSync('src/__tests__/pre-encode.txt', 'utf-8');
  const encoded = encodeContentForVbulletin(raw);
  const expected = fs.readFileSync('src/__tests__/post-encode.txt', 'utf-8');
  expect(encoded).toEqual(expected);
});
