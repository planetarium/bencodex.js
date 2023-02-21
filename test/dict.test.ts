import { zip } from "std/collections/zip.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertFalse,
  assertStrictEquals,
  assertThrows,
} from "std/testing/asserts.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { BencodexDictionary } from "../src/dict.ts";
import { Key, Value } from "../src/types.ts";
import { areUint8ArraysEqual } from "../src/utils.ts";

Deno.test("BencodexDictionary", async (t) => {
  const dict = new BencodexDictionary([
    // string keys:
    ["foo", "bar"],
    ["baz", "qux"],
    ["foo", "dup"],
    // short binary keys:
    [new Uint8Array([0x01, 0x02, 0x03]), "bar"],
    [new Uint8Array([0x04, 0x05, 0x06]), "qux"],
    [new Uint8Array([0x01, 0x02, 0x03]), "dup"],
    // long binary keys:
    [new Uint8Array(64), "bar"],
    [new Uint8Array(64).fill(1, 0), "qux"],
    [new Uint8Array(64), "dup"],
  ]);

  await t.step("new()", () => {
    assertThrows(
      () => new BencodexDictionary(123 as unknown as Iterable<[Key, Value]>),
      TypeError,
      "got a number",
    );
    assertThrows(
      () => new BencodexDictionary(["asdf" as unknown as [Key, Value]]),
      TypeError,
      "got a string",
    );
    assertThrows(
      () => new BencodexDictionary([[] as unknown as [Key, Value]]),
      TypeError,
      "got an array of length 0",
    );
    assertThrows(
      () =>
        new BencodexDictionary(
          [[123, "invalid key"]] as unknown as Iterable<[Key, Value]>,
        ),
      TypeError,
      "string or Uint8Array",
    );
  });

  await t.step("size", () => {
    assertStrictEquals(dict.size, 6);
  });

  await t.step("get()", () => {
    assertStrictEquals(dict.get("foo"), "dup");
    assertStrictEquals(dict.get("baz"), "qux");
    assertStrictEquals(dict.get("qux"), undefined);
    assertStrictEquals(dict.get(new Uint8Array([0x01, 0x02, 0x03])), "dup");
    assertStrictEquals(dict.get(new Uint8Array([0x04, 0x05, 0x06])), "qux");
    assertStrictEquals(dict.get(new Uint8Array([0x07, 0x08, 0x09])), undefined);
    assertStrictEquals(dict.get(new Uint8Array(64)), "dup");
    assertStrictEquals(dict.get(new Uint8Array(64).fill(1, 0)), "qux");
    assertStrictEquals(dict.get(new Uint8Array(64).fill(2, 0)), undefined);
  });

  await t.step("has()", () => {
    assert(dict.has("foo"));
    assert(dict.has("baz"));
    assertFalse(dict.has("qux"));
    assert(dict.has(new Uint8Array([0x01, 0x02, 0x03])));
    assert(dict.has(new Uint8Array([0x04, 0x05, 0x06])));
    assertFalse(dict.has(new Uint8Array([0x07, 0x08, 0x09])));
    assert(dict.has(new Uint8Array(64)));
    assert(dict.has(new Uint8Array(64).fill(1, 0)));
    assertFalse(dict.has(new Uint8Array(64).fill(2, 0)));
  });

  await t.step("keys()", () => {
    const keys = [...dict.keys()];
    assertStrictEquals(keys.length, 6);
    assertArrayIncludes(keys, ["foo", "baz"]);
    const expectedBinKeys = [
      new Uint8Array([0x01, 0x02, 0x03]),
      new Uint8Array([0x04, 0x05, 0x06]),
      new Uint8Array([0x01, 0x02, 0x03]),
      new Uint8Array(64),
      new Uint8Array(64).fill(1, 0),
    ];
    for (const expectedKey of expectedBinKeys) {
      assert(
        keys.some((key) =>
          key instanceof Uint8Array && areUint8ArraysEqual(key, expectedKey)
        ),
        `expected to find ${Deno.inspect(expectedKey)}`,
      );
    }
  });

  await t.step("values()", () => {
    assertEquals([...dict.values()].sort(), [
      "dup",
      "dup",
      "dup",
      "qux",
      "qux",
      "qux",
    ]);
  });

  await t.step("entries()", () => {
    assertEquals(
      [...dict.entries()],
      zip([...dict.keys()], [...dict.values()]),
    );
  });

  await t.step("forEach()", () => {
    const entries = [...dict.entries()];
    let i = 0;
    dict.forEach((value, key, dictionary) => {
      assertStrictEquals(dictionary, dict);
      assertStrictEquals(value, entries[i][1]);
      assertEquals(key, entries[i][0]);
      i++;
    });
    assertStrictEquals(i, 6);
  });

  await t.step("[Symbol.iterator]()", () => {
    assertEquals([...dict], [...dict.entries()]);
  });

  await t.step("[Deno.customInspect]()", async (t) => {
    await assertSnapshot(t, Deno.inspect(dict));
  });
});
