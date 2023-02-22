import {
  assert,
  assertFalse,
  assertStrictEquals,
} from "std/testing/asserts.ts";
import { areUint8ArraysEqual, compareUint8Arrays } from "../src/utils.ts";

Deno.test("areUint8ArraysEqual()", () => {
  const a = new Uint8Array([0x01, 0x02, 0x03]);
  const b = new Uint8Array([0x01, 0x02, 0x03]);
  const c = new Uint8Array([0x01, 0x02, 0x04]);
  const d = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  assert(areUint8ArraysEqual(a, b));
  assertFalse(areUint8ArraysEqual(a, c));
  assertFalse(areUint8ArraysEqual(a, d));
});

Deno.test("compareUint8Arrays()", () => {
  const a = new Uint8Array([0x01, 0x02, 0x03]);
  const b = new Uint8Array([0x01, 0x02, 0x03]);
  const c = new Uint8Array([0x01, 0x02, 0x04]);
  const d = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  assertStrictEquals(compareUint8Arrays(a, b), 0);
  assert(compareUint8Arrays(a, c) < 0);
  assert(compareUint8Arrays(c, a) > 0);
  assert(compareUint8Arrays(a, d) < 0);
  assert(compareUint8Arrays(d, a) > 0);
});
