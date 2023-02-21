import { assert, assertFalse } from "std/testing/asserts.ts";
import { areUint8ArraysEqual } from "../src/utils.ts";

Deno.test("areUint8ArraysEqual()", () => {
  const a = new Uint8Array([0x01, 0x02, 0x03]);
  const b = new Uint8Array([0x01, 0x02, 0x03]);
  const c = new Uint8Array([0x01, 0x02, 0x04]);
  const d = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  assert(areUint8ArraysEqual(a, b));
  assertFalse(areUint8ArraysEqual(a, c));
  assertFalse(areUint8ArraysEqual(a, d));
});
