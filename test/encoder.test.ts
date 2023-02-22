import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "std/testing/asserts.ts";
import {
  compareKeys,
  encodeIntoChunks,
  encodeKeyIntoChunks,
} from "../src/encoder.ts";
import { Dictionary, Key, Value } from "../src/types.ts";

function mergeChunks(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length < 1) return new Uint8Array();
  else if (chunks.length === 1) return chunks[0];
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function assertChunksEqual(
  chunks: Iterable<Uint8Array>,
  expected: Uint8Array,
  message?: string,
) {
  assertEquals(mergeChunks([...chunks]), expected, message);
}

export function assertIterableThrows<T, E extends Error = Error>(
  iterable: Iterable<T>,
  // deno-lint-ignore no-explicit-any
  ErrorClass: new (...args: any[]) => E,
  msgIncludes?: string,
  msg?: string,
): E {
  return assertThrows<E>(
    () => {
      for (const _ of iterable);
    },
    ErrorClass,
    msgIncludes,
    msg,
  );
}

Deno.test("encodeIntoChunks()", () => {
  assertChunksEqual(encodeIntoChunks(null), new Uint8Array([0x6e]));
  assertChunksEqual(encodeIntoChunks(false), new Uint8Array([0x66]));
  assertChunksEqual(encodeIntoChunks(true), new Uint8Array([0x74]));
  assertChunksEqual(
    encodeIntoChunks(123n),
    new Uint8Array([0x69, 0x31, 0x32, 0x33, 0x65]),
  );
  assertChunksEqual(
    encodeIntoChunks(-123n),
    new Uint8Array([0x69, 0x2d, 0x31, 0x32, 0x33, 0x65]),
  );
  assertChunksEqual(
    encodeIntoChunks(new TextEncoder().encode("spam")),
    new Uint8Array([0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d]),
  );
  assertChunksEqual(
    encodeIntoChunks("단팥"),
    new Uint8Array([0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5]),
  );
  assertChunksEqual(
    encodeIntoChunks([123n, new TextEncoder().encode("spam"), "단팥", true]),
    // deno-fmt-ignore
    new Uint8Array([
      0x6c, // prefix
      0x69, 0x31, 0x32, 0x33, 0x65, // 123
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
      0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "단팥"
      0x74, // true
      0x65, // suffix
    ]),
  );
  assertChunksEqual(
    encodeIntoChunks(
      new Map<Key, Value>([
        ["단팥", 123n],
        [new TextEncoder().encode("span"), null],
        [new TextEncoder().encode("spam"), true],
      ]),
    ),
    // deno-fmt-ignore
    new Uint8Array([
      0x64, // prefix
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
      0x74, // true
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6e, // b"span"
      0x6e, // null
      0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5, // "단팥"
      0x69, 0x31, 0x32, 0x33, 0x65, // 123
      0x65, // suffix
    ]),
  );
  assertIterableThrows(
    encodeIntoChunks(
      new Map<Key, Value>([
        [new TextEncoder().encode("spam"), null],
        [new TextEncoder().encode("spam"), true],
      ]),
      { onDuplicateKeys: "throw" },
    ),
    RangeError,
    "duplicate key",
  );
  assertChunksEqual(
    encodeIntoChunks(
      new Map<Key, Value>([
        [new TextEncoder().encode("spam"), null],
        [new TextEncoder().encode("spam"), true],
      ]),
      { onDuplicateKeys: "useFirst" },
    ),
    // deno-fmt-ignore
    new Uint8Array([
      0x64, // prefix
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
      0x6e, // null
      0x65, // suffix
    ]),
  );
  assertChunksEqual(
    encodeIntoChunks(
      new Map<Key, Value>([
        [new TextEncoder().encode("spam"), null],
        [new TextEncoder().encode("spam"), true],
      ]),
      { onDuplicateKeys: "useLast" },
    ),
    // deno-fmt-ignore
    new Uint8Array([
      0x64, // prefix
      0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d, // b"spam"
      0x74, // true
      0x65, // suffix
    ]),
  );
  assertIterableThrows(
    encodeIntoChunks(123 as unknown as Value),
    TypeError,
    "bigint",
  );
  assertIterableThrows(
    encodeIntoChunks({} as unknown as Value),
    TypeError,
    "object",
  );
  assertIterableThrows(
    encodeIntoChunks([123 as unknown as Value]),
    TypeError,
    "bigint",
  );
  assertIterableThrows(
    encodeIntoChunks({
      *entries() {
        yield [];
      },
    } as unknown as Dictionary),
    TypeError,
    "2-element",
  );
  assertIterableThrows(
    encodeIntoChunks({
      *entries() {
        yield [{}, 123n];
      },
    } as unknown as Dictionary),
    TypeError,
  );
});

Deno.test("encodeKeyIntoChunks()", () => {
  assertChunksEqual(
    encodeKeyIntoChunks(new TextEncoder().encode("spam")),
    new Uint8Array([0x34, 0x3a, 0x73, 0x70, 0x61, 0x6d]),
  );
  assertChunksEqual(
    encodeKeyIntoChunks("단팥"),
    new Uint8Array([0x75, 0x36, 0x3a, 0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5]),
  );
  assertIterableThrows(encodeKeyIntoChunks(123 as unknown as Key), TypeError);
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
