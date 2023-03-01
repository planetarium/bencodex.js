import {
  assert,
  assertFalse,
  assertStrictEquals,
  assertThrows,
} from "std/testing/asserts.ts";
import { BencodexDictionary } from "../src/dict.ts";
import {
  areKeysEqual,
  compareKeys,
  isDictionary,
  isKey,
  Key,
  Value,
} from "../src/types.ts";

Deno.test("isDictionary()", () => {
  assertFalse(isDictionary("foo"));
  assertFalse(isDictionary(null));
  assertFalse(isDictionary({ size: "non-number" }));
  assertFalse(isDictionary({ size: 0 }));
  assertFalse(isDictionary({ size: 0, get: "non-function" }));
  assertFalse(isDictionary({ size: 0, get: () => undefined }));
  assertFalse(
    isDictionary({ size: 0, get: () => undefined, has: "non-function" }),
  );
  assertFalse(
    isDictionary({ size: 0, get: () => undefined, has: () => false }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: "non-function",
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: "non-function",
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: "non-function",
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: () => [],
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: () => [],
      forEach: "non-function",
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: () => [],
      forEach: () => undefined,
    }),
  );
  assertFalse(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: () => [],
      forEach: () => undefined,
      [Symbol.iterator]: "non-function",
    }),
  );
  assert(
    isDictionary({
      size: 0,
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: () => [],
      forEach: () => undefined,
      [Symbol.iterator]: () => [],
    }),
  );
  assert(isDictionary(new Map<Key, Value>()));
  assert(isDictionary(new BencodexDictionary()));
});

Deno.test("isKey()", () => {
  assert(isKey("foo"));
  assert(isKey(new Uint8Array(0)));
  assertFalse(isKey(undefined));
  assertFalse(isKey(null));
  assertFalse(isKey(false));
  assertFalse(isKey(true));
  assertFalse(isKey(123));
  assertFalse(isKey(123n));
  assertFalse(isKey([]));
  assertFalse(isKey(new Map()));
  assertFalse(isKey({}));
});

Deno.test("areKeysEqual()", () => {
  assert(areKeysEqual("foo", "foo"));
  assert(areKeysEqual(new Uint8Array(0), new Uint8Array(0)));
  assert(areKeysEqual(new Uint8Array([0, 1, 2]), new Uint8Array([0, 1, 2])));
  assertFalse(areKeysEqual("foo", "bar"));
  assertFalse(areKeysEqual(new Uint8Array(0), new Uint8Array(1)));
  assertFalse(areKeysEqual(new Uint8Array([0, 2]), new Uint8Array([0, 1])));
  assertFalse(areKeysEqual(new Uint8Array([0, 1, 2]), new Uint8Array([0, 1])));
  assertFalse(areKeysEqual(1 as unknown as Key, 1 as unknown as Key));
});

Deno.test("compareKeys()", () => {
  const a = new Uint8Array([0x01, 0x02, 0x03]);
  const b = new Uint8Array([0x01, 0x02, 0x03]);
  const c = new Uint8Array([0x01, 0x02, 0x04]);
  const d = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  assert(compareKeys("abc", a) > 0);
  assert(compareKeys(a, "abc") < 0);
  assertStrictEquals(compareKeys("abc", "abc"), 0);
  assert(compareKeys("abc", "abd") < 0);
  assert(compareKeys("abc", "bba") < 0);
  assert(compareKeys("abc", "abb") > 0);
  assert(compareKeys("acb", "abc") > 0);
  assert(compareKeys("abc", "abcd") < 0);
  assert(compareKeys("abc", "ab") > 0);
  assertStrictEquals(compareKeys(a, b), 0);
  assert(compareKeys(a, c) < 0);
  assert(compareKeys(c, a) > 0);
  assert(compareKeys(a, d) < 0);
  assert(compareKeys(d, a) > 0);
  assertThrows(() => compareKeys(123 as unknown as string, "abc"), TypeError);
  assertThrows(() => compareKeys("abc", 123 as unknown as string), TypeError);
  assertThrows(
    () => compareKeys(123 as unknown as string, new Uint8Array()),
    TypeError,
  );
  assertThrows(
    () => compareKeys(new Uint8Array(), 123 as unknown as string),
    TypeError,
  );
});
