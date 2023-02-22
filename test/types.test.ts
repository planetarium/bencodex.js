import { assert, assertFalse } from "std/testing/asserts.ts";
import { areKeysEqual, isKey, Key } from "../src/types.ts";

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
