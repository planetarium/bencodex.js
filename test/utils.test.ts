import {
  assert,
  assertEquals,
  assertFalse,
  assertStrictEquals,
} from "std/testing/asserts.ts";
import {
  areUint8ArraysEqual,
  compareUint8Arrays,
  decodeAsciiNaturalNumber,
} from "../src/utils.ts";

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

Deno.test("decodeAsciiNaturalNumber()", async (t: Deno.TestContext) => {
  await t.step("number", () => {
    const buffer = new Uint8Array(128);
    const textEncoder = new TextEncoder();
    textEncoder.encodeInto("1234", buffer);
    assertEquals(
      decodeAsciiNaturalNumber(buffer, "number"),
      { success: true, read: 4, value: 1234 },
    );
    buffer[2] = 0x3a;
    assertEquals(
      decodeAsciiNaturalNumber(buffer, "number"),
      { success: true, read: 2, value: 12 },
    );
    buffer[0] = 0xff;
    assertEquals(decodeAsciiNaturalNumber(buffer, "number"), {
      success: false,
      read: 0,
    });
  });

  await t.step("bigint", () => {
    const buffer = new Uint8Array(128);
    const textEncoder = new TextEncoder();
    textEncoder.encodeInto("1234", buffer);
    assertEquals(
      decodeAsciiNaturalNumber(buffer, "bigint"),
      { success: true, read: 4, value: 1234n },
    );
    buffer[2] = 0x3a;
    assertEquals(
      decodeAsciiNaturalNumber(buffer, "bigint"),
      { success: true, read: 2, value: 12n },
    );
    buffer[0] = 0xff;
    assertEquals(decodeAsciiNaturalNumber(buffer, "bigint"), {
      success: false,
      read: 0,
    });
  });
});
