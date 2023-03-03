import {
  assert,
  assertFalse,
  assertStrictEquals,
  assertThrows,
} from "std/testing/asserts.ts";
import { BencodexDictionary, RecordView } from "../src/dict.ts";
import {
  areDictionariesEqual,
  areKeysEqual,
  areValuesEqual,
  compareKeys,
  Dictionary,
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

Deno.test("areDictionariesEqual()", () => {
  assert(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "text"),
      new Map<Key, Value>([["foo", 1n], ["bar", 2n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "text"),
      new Map<Key, Value>([["foo", 1n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "text"),
      new Map<Key, Value>([["foo", 1n], ["baz", 3n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n }, "text"),
      new Map<Key, Value>([["foo", 1n], ["bar", 2n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "text"),
      new Map<Key, Value>([["foo", 1n], ["bar", 3n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "utf8"),
      new Map<Key, Value>([["foo", 1n], ["bar", 2n]]),
    ),
  );
  const utf8Foo = new Uint8Array([0x66, 0x6f, 0x6f]);
  const utf8Bar = new Uint8Array([0x62, 0x61, 0x72]);
  assert(
    areDictionariesEqual(
      new BencodexDictionary([[utf8Foo, 1n], [utf8Bar, 2n]]),
      new RecordView({ foo: 1n, bar: 2n }, "utf8"),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new BencodexDictionary([[utf8Foo, 1n], [utf8Bar, 2n]]),
      new RecordView({ foo: 1n }, "utf8"),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new BencodexDictionary([[utf8Foo, 1n]]),
      new RecordView({ foo: 1n, bar: 2n }, "utf8"),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new BencodexDictionary([[utf8Foo, 1n], [utf8Bar, 2n]]),
      new RecordView({ foo: 1n, bar: 3n }, "utf8"),
    ),
  );
  assert(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "utf8"),
      new Map<Key, Value>([[utf8Foo, 1n], [utf8Bar, 2n]]),
    ),
  );
  assert(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "utf8"),
      new Map<Key, Value>([[utf8Foo, 1n], [utf8Bar, 2n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n }, "utf8"),
      new Map<Key, Value>([[utf8Foo, 1n], [utf8Bar, 2n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 2n }, "utf8"),
      new Map<Key, Value>([[utf8Foo, 1n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(
      new RecordView({ foo: 1n, bar: 3n }, "utf8"),
      new Map<Key, Value>([[utf8Foo, 1n], [utf8Bar, 2n]]),
    ),
  );
  assertFalse(
    areDictionariesEqual(new Map<Key, Value>(), null as unknown as Dictionary),
  );
  assertFalse(
    areDictionariesEqual(null as unknown as Dictionary, new Map<Key, Value>()),
  );
});

Deno.test("areValuesEqual()", () => {
  assert(areValuesEqual(null, null));
  assertFalse(areValuesEqual(null, true));
  assertFalse(areValuesEqual(false, null));
  assert(areValuesEqual(true, true));
  assert(areValuesEqual(false, false));
  assertFalse(areValuesEqual(true, false));
  assertFalse(areValuesEqual(false, true));
  assert(areValuesEqual(123n, 123n));
  assertFalse(areValuesEqual(123n, -123n));
  assert(areValuesEqual("text", "text"));
  assertFalse(areValuesEqual("text", "another text"));
  assertFalse(areValuesEqual("text", new Uint8Array([])));
  assert(areValuesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])));
  assertFalse(
    areValuesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
  );
  assert(areValuesEqual([1n, 2n, 3n], [1n, 2n, 3n]));
  assertFalse(areValuesEqual([1n, 2n, 3n], [1n, 2n]));
  assertFalse(areValuesEqual([1n, 2n, 3n], [1n, 2n, 4n]));
  assertFalse(areValuesEqual([1n, 2n, 3n], [1n, 3n, 2n]));
  const utf8Foo = new Uint8Array([0x66, 0x6f, 0x6f]);
  const utf8Bar = new Uint8Array([0x62, 0x61, 0x72]);
  assert(
    areValuesEqual(
      [1n, [2n, 3n], new RecordView({ foo: 1n, bar: 2n }, "utf8")],
      [1n, [2n, 3n], new Map([[utf8Foo, 1n], [utf8Bar, 2n]])],
    ),
  );
  assertFalse(
    areValuesEqual(
      [1n, [2n, 3n], new RecordView({ foo: 1n, bar: 2n }, "utf8")],
      [1n, [2n, 4n], new Map([[utf8Foo, 1n], [utf8Bar, 2n]])],
    ),
  );
  assertFalse(
    areValuesEqual(
      [1n, [2n, 3n], new RecordView({ foo: 1n, baz: 2n }, "utf8")],
      [1n, [2n, 3n], new Map([[utf8Foo, 1n], [utf8Bar, 2n]])],
    ),
  );
});
