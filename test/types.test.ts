import { assert, assertFalse } from "std/testing/asserts.ts";
import { isKey } from "../src/types.ts";

Deno.test("isKey", () => {
  assert(isKey("foo"));
  assert(isKey(new Uint8Array(0)));
  assertFalse(isKey(123));
  assertFalse(isKey({}));
});
