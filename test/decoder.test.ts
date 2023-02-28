import {
  assert,
  assertEquals,
  assertFalse,
  assertInstanceOf,
  assertStrictEquals,
} from "std/testing/asserts.ts";
import { decodeKey, decodeValue } from "../src/decoder.ts";
import { BencodexDictionary } from "../src/dict.ts";
import { compareKeys, Key, Value } from "../src/types.ts";

Deno.test("decodeValue()", async (t: Deno.TestContext) => {
  await t.step("null", () => {
    const buffer = new Uint8Array([0x6e]); // b"n"
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 1);
    assertStrictEquals(endState.value, null);
  });

  await t.step("false", () => {
    const buffer = new Uint8Array([0x66]); // b"f"
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 1);
    assertStrictEquals(endState.value, false);
  });

  await t.step("true", () => {
    const buffer = new Uint8Array([0x74]); // b"t"
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 1);
    assertStrictEquals(endState.value, true);
  });

  await t.step("positive integer", () => {
    const buffer = new Uint8Array([0x69, 0x31, 0x32, 0x33, 0x65]); // b"i123e"
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 5);
    assertStrictEquals(endState.value, 123n);
  });

  await t.step("negative integer", () => {
    const buffer = new Uint8Array([0x69, 0x2d, 0x34, 0x35, 0x65]); // b"i-45e"
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 5);
    assertStrictEquals(endState.value, -45n);
  });

  await t.step("invalid integer", () => {
    const buffer = new Uint8Array([0x69, 0x78, 0x65]); // b"ixe"
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 1, error: "invalidInteger" },
    );
  });

  await t.step("integer with no suffix", () => {
    const buffer = new Uint8Array([0x69, 0x31, 0x32, 0x33, 0x78]); // b"i123x"
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 4, error: "noIntegerSuffix" },
    );
  });

  await t.step("text", () => {
    const buffer = new Uint8Array(64);
    // deno-fmt-ignore
    buffer.set([
      0x75, 0x35, 0x3a,  // b"u5:"
      0x68, 0x65, 0x6c, 0x6c, 0x6f,  // b"hello"
    ]);
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 8);
    assertStrictEquals(endState.value, "hello");
  });

  await t.step("binary", () => {
    const buffer = new Uint8Array(128);
    // deno-fmt-ignore
    buffer.set([
      0x31, 0x30, 0x3a,  // b"10:"
      0x61, 0x62, 0x63, 0x64, 0x65,  // b"abcde"
      0x66, 0x67, 0x68, 0x69, 0x6a,  // b"fghij"
    ]);
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      {
        success: true,
        read: 13,
        value: new Uint8Array(
          [0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a],
        ),
      },
    );
  });

  await t.step("list", () => {
    // deno-fmt-ignore
    const buffer = new Uint8Array([
      0x6c, // b"l"
      0x69, 0x31, 0x32, 0x33, 0x65, // b"i123e"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"4:spam"
      0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "u6:단팥"
      0x6c, 0x69, 0x34, 0x35, 0x36, 0x65, 0x6e, 0x65, // b"li456ene"
      0x74, // b"t"
      0x65, // b"e"
    ]);
    const endState = decodeValue(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 31);
    assertEquals(endState.value, [
      123n,
      new TextEncoder().encode("spam"),
      "단팥",
      [456n, null],
      true,
    ]);
  });

  await t.step("list with invalid items", () => {
    const buffer = new Uint8Array([0x6c, 0x78, 0x65]); // lxe
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 1, error: "unexpectedByte" },
    );
  });

  await t.step("list with no suffix", () => {
    const buffer = new Uint8Array([0x6c, 0x74]); // lt
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 2, error: "noListSuffix" },
    );
  });

  for (const ctor of [BencodexDictionary, Map<Key, Value>]) {
    await t.step(`dictionary into ${ctor.name}`, () => {
      // deno-fmt-ignore
      const buffer = new Uint8Array([
      0x64, // b"d"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"4:spam"
      0x74, // b"t"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6e, // b"4:span"
      0x6e, // b"n"
      0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "u6:단팥"
      0x69, 0x31, 0x32, 0x33, 0x65, // b"i123e"
      0x65, // b"e"
    ]);
      const endState = decodeValue(buffer, { dictionaryConstructor: ctor });
      assert(endState.success);
      assertStrictEquals(endState.read, 30);
      assertInstanceOf(endState.value, ctor);
      assertEquals(
        [...endState.value.entries()].sort(([a], [b]) => compareKeys(a, b)),
        [
          [new TextEncoder().encode("spam"), true],
          [new TextEncoder().encode("span"), null],
          ["단팥", 123n],
        ],
      );
    });
  }

  await t.step("dictionary with invalid keys", () => {
    const buffer = new Uint8Array([0x64, 0x30, 0x3a, 0x74]); // b"b0:t"
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 4, error: "noDictionarySuffix" },
    );
  });

  await t.step("dictionary with suffix", () => {
    // deno-fmt-ignore
    const buffer = new Uint8Array([
      0x64, // b"d"
      0x30, 0x3a, // b"0:"
      0x65, // b"e"
    ]);
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 3, error: "unexpectedByte" },
    );
  });

  await t.step("dictionary with invalid values", () => {
    const buffer = new Uint8Array([0x64, 0x74, 0x6e, 0x65]); // b"dtne"
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 1, error: "noBinaryLength" },
    );
  });

  await t.step("dictionary with unordered keys", () => {
    // deno-fmt-ignore
    const buffer = new Uint8Array([
      0x64, // b"d"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6e, // b"4:span"
      0x6e, // b"n"
      0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "u6:단팥"
      0x69, 0x31, 0x32, 0x33, 0x65, // b"i123e"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"4:spam"
      0x74, // b"t"
      0x65, // b"e"
    ]);
    let endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 28, error: "unorderedDictionaryKeys" },
    );

    endState = decodeValue(buffer, { onInvalidKeyOrder: "ignore" });
    assert(endState.success);
    assertStrictEquals(endState.read, 30);
    assertInstanceOf(endState.value, BencodexDictionary);
    assertEquals(
      [...endState.value.entries()].sort(([a], [b]) => compareKeys(a, b)),
      [
        [new TextEncoder().encode("spam"), true],
        [new TextEncoder().encode("span"), null],
        ["단팥", 123n],
      ],
    );
  });

  await t.step("dictionary with duplicate keys", () => {
    // deno-fmt-ignore
    const buffer = new Uint8Array([
      0x64, // b"d"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"4:spam"
      0x74, // b"t"
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"4:spam"
      0x6e, // b"n"
      0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "u6:단팥"
      0x69, 0x31, 0x32, 0x33, 0x65, // b"i123e"
      0x65, // b"e"
    ]);
    let endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 14, error: "duplicateDictionaryKeys" },
    );

    endState = decodeValue(buffer, { onInvalidKeyOrder: "ignore" });
    assert(endState.success);
    assertStrictEquals(endState.read, 30);
    assertInstanceOf(endState.value, BencodexDictionary);
    assertEquals(
      [...endState.value.entries()].sort(([a], [b]) => compareKeys(a, b)),
      [
        [new TextEncoder().encode("spam"), null],
        ["단팥", 123n],
      ],
    );
  });

  await t.step("empty buffer", () => {
    const buffer = new Uint8Array(0);
    const endState = decodeValue(buffer);
    assertEquals(
      endState,
      { success: false, read: 0, error: "unexpectedEndOfInput" },
    );
  });
});

Deno.test("decodeKey()", async (t: Deno.TestContext) => {
  await t.step("binary", () => {
    const buffer = new Uint8Array(128);
    // deno-fmt-ignore
    buffer.set([
      0x31, 0x30, 0x3a,  // b"10:"
      0x61, 0x62, 0x63, 0x64, 0x65,  // b"abcde"
      0x66, 0x67, 0x68, 0x69, 0x6a,  // b"fghij"
    ]);
    const endState = decodeKey(buffer);
    assertEquals(
      endState,
      {
        success: true,
        read: 13,
        value: new Uint8Array(
          [0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a],
        ),
      },
    );
  });

  await t.step("binary with no length", () => {
    const buffer = new Uint8Array(128);
    // deno-fmt-ignore
    buffer.set([
      0x3a,  // b":"
      0x61, 0x62, 0x63, 0x64, 0x65,  // b"abcde"
    ]);
    const endState = decodeKey(buffer);
    assertEquals(
      endState,
      { success: false, read: 0, error: "noBinaryLength" },
    );
  });

  await t.step("binary with no delimiter", () => {
    const buffer = new Uint8Array(128);
    // deno-fmt-ignore
    buffer.set([
      0x35, 0x78,  // b"5x"
      0x61, 0x62, 0x63, 0x64, 0x65,  // b"abcde"
    ]);
    const endState = decodeKey(buffer);
    assertEquals(
      endState,
      { success: false, read: 1, error: "noBinaryDelimiter" },
    );
  });

  await t.step("binary with over run length", () => {
    // deno-fmt-ignore
    const buffer = new Uint8Array([
      0x35, 0x3a,  // b"5:"
      0x61, 0x62, 0x63,  // b"abc"
    ]);
    const endState = decodeKey(buffer);
    assertEquals(
      endState,
      { success: false, read: 5, error: "overRunBinaryLength" },
    );
  });

  await t.step("text", () => {
    const buffer = new Uint8Array(64);
    // deno-fmt-ignore
    buffer.set([
      0x75, 0x35, 0x3a,  // b"u5:"
      0x68, 0x65, 0x6c, 0x6c, 0x6f,  // b"hello"
    ]);
    const endState = decodeKey(buffer);
    assert(endState.success);
    assertStrictEquals(endState.read, 8);
    assertStrictEquals(endState.value, "hello");
  });

  await t.step("text with no length", () => {
    const buffer = new Uint8Array(
      [0x75, 0x3a, 0x68, 0x65, 0x6c, 0x6c, 0x6f], // b"u:hello"
    );
    const endState = decodeKey(buffer);
    assertFalse(endState.success);
    assertStrictEquals(endState.read, 1);
    assertEquals(endState.error, "noTextLength");
  });

  await t.step("text with no delimiter", () => {
    const buffer = new Uint8Array(
      [0x75, 0x35, 0x68, 0x65, 0x6c, 0x6c, 0x6f], // b"u5hello"
    );
    const endState = decodeKey(buffer);
    assertFalse(endState.success);
    assertStrictEquals(endState.read, 2);
    assertEquals(endState.error, "noTextDelimiter");
  });

  await t.step("text with over run length", () => {
    const buffer = new Uint8Array(
      [0x75, 0x35, 0x3a, 0x68, 0x69], // b"u5:hi"
    );
    const endState = decodeKey(buffer);
    assertFalse(endState.success);
    assertStrictEquals(endState.read, 5);
    assertEquals(endState.error, "overRunTextLength");
  });

  await t.step("empty buffer", () => {
    const buffer = new Uint8Array(0);
    const endState = decodeKey(buffer);
    assertFalse(endState.success);
    assertStrictEquals(endState.read, 0);
    assertEquals(endState.error, "unexpectedEndOfInput");
  });
});
