import {
  assert,
  assertEquals,
  assertFalse,
  assertStrictEquals,
  assertThrows,
} from "std/testing/asserts.ts";
import { encodeInto, encodeKeyInto } from "../src/encoder.ts";
import { type Dictionary, type Key, type Value } from "../src/types.ts";

Deno.test("encodeInto()", async (t: Deno.TestContext) => {
  const atoms: [Value, number][] = [[null, 0x6e], [false, 0x66], [true, 0x74]];
  for (const [value, coding] of atoms) {
    await t.step(`${JSON.stringify(value)} with enough buffer`, () => {
      const buffer = new Uint8Array(8).fill(0x80);
      const endState = encodeInto(value, buffer);
      assertStrictEquals(endState.written, 1);
      assert(endState.complete);
      assertEquals(
        buffer.subarray(0, endState.written),
        new Uint8Array([coding]),
      );
      assertEquals(
        buffer.subarray(endState.written),
        new Uint8Array(7).fill(0x80),
      );
    });

    await t.step(`${JSON.stringify(value)} with insufficient buffer`, () => {
      const buffer = new Uint8Array(0);
      const endState = encodeInto(value, buffer);
      assertStrictEquals(endState.written, 0);
      assert(!endState.complete);
    });
  }

  await t.step("positive bigint with enough buffer", () => {
    const buffer = new Uint8Array(32).fill(0x80);
    const endState = encodeInto(1234n, buffer);
    assertStrictEquals(endState.written, 6);
    assert(endState.complete);
    assertEquals(
      buffer.subarray(0, endState.written),
      new Uint8Array([0x69, 0x31, 0x32, 0x33, 0x34, 0x65]),
    );
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(26).fill(0x80),
    );
  });

  await t.step("negative bigint with enough buffer", () => {
    const buffer = new Uint8Array(32).fill(0x80);
    const endState = encodeInto(-456n, buffer);
    assertStrictEquals(endState.written, 6);
    assert(endState.complete);
    assertEquals(
      buffer.subarray(0, endState.written),
      new Uint8Array([0x69, 0x2d, 0x34, 0x35, 0x36, 0x65]),
    );
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(26).fill(0x80),
    );
  });

  for (let size = 0; size < 2; size++) {
    await t.step(`bigint with insufficient buffer (${size} B)`, () => {
      const buffer = new Uint8Array(size);
      const endState = encodeInto(1n, buffer);
      assertStrictEquals(endState.written, size);
      assertFalse(endState.complete);
      assertEquals(
        buffer,
        new Uint8Array([0x69, 0x1d, 0x65]).subarray(0, size),
      );
    });
  }

  await t.step("string", () => {
    const buffer = new Uint8Array(128).fill(0x80);
    const endState = encodeInto("단팥", buffer);
    assertStrictEquals(endState.written, 9);
    assert(endState.complete);
    assertEquals(
      buffer.subarray(0, endState.written),
      new Uint8Array([0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5]),
    );
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  await t.step("Uint8Array", () => {
    const buffer = new Uint8Array(128).fill(0x80);
    const endState = encodeKeyInto(new TextEncoder().encode("spam"), buffer);
    assertStrictEquals(endState.written, 6);
    assert(endState.complete);
    assertEquals(
      buffer.subarray(0, endState.written),
      new Uint8Array(
        [0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d],
      ),
    );
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  const list = [
    123n,
    new TextEncoder().encode("spam"),
    "단팥",
    [456n, null],
    true,
  ];
  // deno-fmt-ignore
  const expectedListBytes = new Uint8Array([
    0x6c, // prefix
    0x69, 0x31, 0x32, 0x33, 0x65, // 123
    0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
    0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "단팥"
    0x6c, 0x69, 0x34, 0x35, 0x36, 0x65, 0x6e, 0x65, // [456, null]
    0x74, // true
    0x65, // suffix
  ]);

  await t.step("Array with enough buffer", () => {
    const buffer = new Uint8Array(128).fill(0x80);
    const endState = encodeInto(list, buffer);
    assertStrictEquals(endState.written, 31);
    assert(endState.complete);
    assertEquals(buffer.subarray(0, endState.written), expectedListBytes);
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  for (const size of [0, 1, 2, 30]) {
    await t.step(`Array with insufficient buffer (${size} B)`, () => {
      const buffer = new Uint8Array(size);
      const endState = encodeInto(list, buffer);
      assertStrictEquals(endState.written, size);
      assertFalse(endState.complete);
      assertEquals(buffer, expectedListBytes.subarray(0, size));
    });
  }

  await t.step("Array with invalid elements", () => {
    assertThrows(
      () => encodeInto([123 as unknown as Value], new Uint8Array(16)),
      TypeError,
      "floating-point",
    );
  });

  const dict = new Map<Key, Value>([
    ["단팥", 123n],
    [new TextEncoder().encode("span"), null],
    [new TextEncoder().encode("spam"), true],
  ]);
  // deno-fmt-ignore
  const expectedDictBytes = new Uint8Array([
    0x64, // prefix
    0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
    0x74, // true
    0x34, 0x3a, 0x73, 0x70, 0x61, 0x6e, // b"span"
    0x6e, // null
    0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "단팥"
    0x69, 0x31, 0x32, 0x33, 0x65, // 123
    0x65, // suffix
  ]);

  await t.step("Dictionary with enough buffer", () => {
    const buffer = new Uint8Array(128).fill(0x80);
    const endState = encodeInto(dict, buffer);
    assertStrictEquals(endState.written, 30);
    assert(endState.complete);
    assertEquals(buffer.subarray(0, endState.written), expectedDictBytes);
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  for (const size of [0, 1, 2, 3, 27, 29]) {
    await t.step(`Dictionary with insufficient buffer (${size} B)`, () => {
      const buffer = new Uint8Array(size);
      const endState = encodeInto(dict, buffer);
      assertStrictEquals(endState.written, size);
      assertFalse(endState.complete);
      assertEquals(buffer, expectedDictBytes.subarray(0, size));
    });
  }

  await t.step("Dictionary with duplicate keys", () => {
    const dict = new Map<Key, Value>([
      [new TextEncoder().encode("spam"), null],
      [new TextEncoder().encode("spam"), true],
    ]);
    assertThrows(() => encodeInto(dict, new Uint8Array(8)), RangeError);

    const buffer = new Uint8Array(128).fill(0x80);
    let endState = encodeInto(dict, buffer, { onDuplicateKeys: "useFirst" });
    assertStrictEquals(endState.written, 9);
    assert(endState.complete);
    assertEquals(
      buffer.subarray(0, endState.written),
      // deno-fmt-ignore
      new Uint8Array([
        0x64, // prefix
        0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
        0x6e, // null
        0x65, // suffix
      ]),
    );
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );

    buffer.fill(0x80);
    endState = encodeInto(dict, buffer, { onDuplicateKeys: "useLast" });
    assertStrictEquals(endState.written, 9);
    assert(endState.complete);
    assertEquals(
      buffer.subarray(0, endState.written),
      // deno-fmt-ignore
      new Uint8Array([
        0x64, // prefix
        0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
        0x74, // null
        0x65, // suffix
      ]),
    );
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  await t.step("Dictionary with invalid entries", () => {
    assertThrows(
      () =>
        encodeInto({
          *entries() {
            yield [];
          },
        } as unknown as Dictionary, new Uint8Array(16)),
      TypeError,
      "2-element",
    );
  });

  await t.step("Dictionary with invalid keys", () => {
    assertThrows(
      () =>
        encodeInto({
          *entries() {
            yield [{}, 123n];
          },
        } as unknown as Dictionary, new Uint8Array(16)),
      TypeError,
    );
  });

  await t.step("invalid value", () => {
    const buffer = new Uint8Array(8).fill(0x80);
    assertThrows(
      () => encodeInto(1234 as unknown as Value, buffer),
      TypeError,
      "floating-point numbers",
    );
    assertEquals(buffer, new Uint8Array(8).fill(0x80));
    assertThrows(
      () => encodeInto(new Date() as unknown as Value, buffer),
      TypeError,
    );
    assertEquals(buffer, new Uint8Array(8).fill(0x80));
  });
});

Deno.test("encodeKeyInto()", async (t: Deno.TestContext) => {
  const textKey = "단팥";
  const expectedTextBytes = new Uint8Array(
    [0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5],
  );
  const binaryKey = new TextEncoder().encode("spam");
  const expectedBinaryBytes = new Uint8Array(
    [0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d],
  );

  await t.step("string with enough buffer", () => {
    const buffer = new Uint8Array(128).fill(0x80);
    const endState = encodeKeyInto(textKey, buffer);
    assertStrictEquals(endState.written, 9);
    assert(endState.complete);
    assertEquals(buffer.subarray(0, endState.written), expectedTextBytes);
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  for (let size = 0; size < 4; size++) {
    await t.step(`string with insufficient buffer (${size} B)`, () => {
      const buffer = new Uint8Array(size);
      const endState = encodeKeyInto(textKey, buffer);
      assertStrictEquals(endState.written, size);
      assertFalse(endState.complete);
      assertEquals(
        buffer.subarray(0, endState.written),
        expectedTextBytes.subarray(0, size),
      );
    });
  }

  await t.step("Uint8Array with enough buffer", () => {
    const buffer = new Uint8Array(128).fill(0x80);
    const endState = encodeKeyInto(binaryKey, buffer);
    assertStrictEquals(endState.written, 6);
    assert(endState.complete);
    assertEquals(buffer.subarray(0, endState.written), expectedBinaryBytes);
    assertEquals(
      buffer.subarray(endState.written),
      new Uint8Array(buffer.length - endState.written).fill(0x80),
    );
  });

  for (let size = 0; size < 3; size++) {
    await t.step(`Uint8Array with insufficient buffer (${size} B)`, () => {
      const buffer = new Uint8Array(size);
      const endState = encodeKeyInto(binaryKey, buffer);
      assertStrictEquals(endState.written, size);
      assertFalse(endState.complete);
      assertEquals(
        buffer.subarray(0, endState.written),
        expectedBinaryBytes.subarray(0, size),
      );
    });
  }

  await t.step("invalid key", () => {
    const buffer = new Uint8Array(8).fill(0x80);
    assertThrows(
      () => encodeKeyInto(123 as unknown as Key, buffer),
      TypeError,
    );
    assertEquals(buffer, new Uint8Array(8).fill(0x80));
  });
});
