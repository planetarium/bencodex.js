import { assertEquals } from "std/testing/asserts.ts";
import {
  compareKeys,
  Dictionary,
  isDictionary,
  Key,
  Value,
} from "../src/types.ts";

function normalizeDictionaryToEntries(
  dict: Dictionary,
): [Key, Value][] {
  const entries: [Key, Value][] = [];
  for (const [key, value] of dict.entries()) {
    entries.push([
      key,
      isDictionary(value) ? normalizeDictionaryToEntries(value) : value,
    ]);
  }
  entries.sort(([a], [b]) => compareKeys(a, b));
  return entries;
}

export function assertDictionariesEqual(
  actual: Dictionary,
  expected: Dictionary | [Key, Value][],
  message?: string,
): void {
  const actualEntries = normalizeDictionaryToEntries(actual);
  const expectedEntries = Array.isArray(expected)
    ? expected.map(([k, v]) => {
      const pair: [Key, Value] = [
        k,
        isDictionary(v) ? normalizeDictionaryToEntries(v) : v,
      ];
      return pair;
    }).sort(([a], [b]) => compareKeys(a, b))
    : normalizeDictionaryToEntries(expected);
  assertEquals(actualEntries, expectedEntries, message);
}
