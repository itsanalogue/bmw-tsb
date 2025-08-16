import { expect, test } from "vitest";
import { parseTsbDate } from "../src/index.js";

test("parseTsbDate recognizes common formats", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expect(parseTsbDate("20250115")?.getFullYear()).toBe(2025);
  expect(parseTsbDate("01/15/2025")?.getMonth()).toBe(0);
  expect(parseTsbDate("2025-01-15")?.getDate()).toBe(15);
  expect(parseTsbDate("2025/01/15")?.getDate()).toBe(15);
  expect(parseTsbDate("invalid")).toBeUndefined();
});
