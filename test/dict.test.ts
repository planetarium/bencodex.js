import { zip } from "std/collections/zip.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertFalse,
  assertInstanceOf,
  assertStrictEquals,
  assertThrows,
} from "std/testing/asserts.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { isDeno } from "which_runtime";
import {
  BencodexDictionary,
  isRecordValue,
  RecordValue,
  RecordView,
} from "../src/dict.ts";
import {
  compareKeys,
  isDictionary,
  type Key,
  type Value,
} from "../src/types.ts";
import { areUint8ArraysEqual } from "../src/utils.ts";
import { assertDictionariesEqual } from "./asserts.ts";

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
    const textEncoder = new TextEncoder();
    const spam = textEncoder.encode("spam");
    const span = textEncoder.encode("span");
    const d = new BencodexDictionary([
      [spam, true],
      [span, null],
      ["단팥", 123n],
    ]);
    assertStrictEquals(d.size, 3);
    assertStrictEquals(d.get(spam), true);
    assertStrictEquals(d.get(span), null);
    assertStrictEquals(d.get("단팥"), 123n);

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

  if (isDeno) {
    await t.step("[Deno.customInspect]()", async (t) => {
      const nodeInspect = Symbol.for("nodejs.util.inspect.custom");
      assert(nodeInspect in dict);
      assertInstanceOf(dict[nodeInspect], Function);
      for (const compact of [true, false]) {
        for (const depth of [0, 1, 2, 3]) {
          for (const sorted of [true, false]) {
            for (const trailingComma of [true, false]) {
              const options = { compact, depth, sorted, trailingComma };
              await assertSnapshot(t, Deno.inspect(dict, options));
              const nodeOptions = { ...options, trailingComma: false };
              assertEquals(
                dict[nodeInspect](depth, options, Deno.inspect),
                Deno.inspect(dict, nodeOptions),
              );
            }
          }
        }
      }
    });
  }
});

Deno.test("isRecordValue()", () => {
  assertFalse(isRecordValue("not an object" as unknown as Value));
});

Deno.test("RecordView", async (t: Deno.TestContext) => {
  const record: RecordValue = {
    foo: "bar",
    baz: "qux",
    "단팥": {
      spam: "span",
      eggs: "ham",
    },
  };
  const textView = new RecordView(record, "text");
  const utf8View = new RecordView(record, "utf8");
  const utf8Foo = new Uint8Array([0x66, 0x6f, 0x6f]);
  const utf8Baz = new Uint8Array([0x62, 0x61, 0x7a]);
  const utf8Qux = new Uint8Array([0x71, 0x75, 0x78]);
  const utf8단팥 = new Uint8Array([0xeb, 0x8b, 0xa8, 0xed, 0x8c, 0xa5]);
  const utf8Spam = new Uint8Array([0x73, 0x70, 0x61, 0x6d]);
  const utf8Eggs = new Uint8Array([0x65, 0x67, 0x67, 0x73]);

  await t.step("new()", () => {
    assertThrows(
      () =>
        new RecordView(
          "not an object" as unknown as Record<string, Value>,
          "text",
        ),
      TypeError,
      "got a string",
    );
    assertThrows(
      () => new RecordView(null as unknown as Record<string, Value>, "text"),
      TypeError,
      "got null",
    );
  });

  await t.step("size", () => {
    assertStrictEquals(textView.size, 3);
    assertStrictEquals(utf8View.size, 3);
  });

  await t.step("get()", () => {
    assertStrictEquals(textView.get("foo"), "bar");
    assertStrictEquals(textView.get("baz"), "qux");
    const v = textView.get("단팥");
    assert(isDictionary(v));
    assertDictionariesEqual(v, [
      ["spam", "span"],
      ["eggs", "ham"],
    ]);
    assertStrictEquals(textView.get("qux"), undefined);
    assertStrictEquals(textView.get(utf8Foo), undefined);
    assertStrictEquals(textView.get(utf8Baz), undefined);
    assertStrictEquals(textView.get(utf8단팥), undefined);

    assertStrictEquals(utf8View.get(utf8Foo), "bar");
    assertStrictEquals(utf8View.get(utf8Baz), "qux");
    const v2 = utf8View.get(utf8단팥);
    assert(isDictionary(v2));
    assertDictionariesEqual(v2, [
      [utf8Spam, "span"],
      [utf8Eggs, "ham"],
    ]);
    assertStrictEquals(utf8View.get(utf8Qux), undefined);
    assertStrictEquals(utf8View.get("foo"), undefined);
    assertStrictEquals(utf8View.get("baz"), undefined);
    assertStrictEquals(utf8View.get("단팥"), undefined);
  });

  await t.step("has()", () => {
    assert(textView.has("foo"));
    assert(textView.has("baz"));
    assert(textView.has("단팥"));
    assertFalse(textView.has("qux"));
    assertFalse(textView.has(utf8Foo));
    assertFalse(textView.has(utf8Baz));
    assertFalse(textView.has(utf8단팥));

    assert(utf8View.has(utf8Foo));
    assert(utf8View.has(utf8Baz));
    assert(utf8View.has(utf8단팥));
    assertFalse(utf8View.has(utf8Qux));
    assertFalse(utf8View.has("foo"));
    assertFalse(utf8View.has("baz"));
    assertFalse(utf8View.has("단팥"));
  });

  await t.step("keys()", () => {
    assertEquals(
      [...textView.keys()].sort(compareKeys),
      ["baz", "foo", "단팥"],
    );
    assertEquals(
      [...utf8View.keys()].sort(compareKeys),
      [utf8Baz, utf8Foo, utf8단팥],
    );
  });

  await t.step("values()", () => {
    const textViewValues = [...textView.values()];
    assertStrictEquals(textViewValues.length, 3);
    assertArrayIncludes(textViewValues, ["bar", "qux"]);
    assertDictionariesEqual(textViewValues.filter(isDictionary)[0], [
      ["spam", "span"],
      ["eggs", "ham"],
    ]);

    const utf8ViewValues = [...utf8View.values()];
    assertStrictEquals(utf8ViewValues.length, 3);
    assertArrayIncludes(utf8ViewValues, ["bar", "qux"]);
    assertDictionariesEqual(utf8ViewValues.filter(isDictionary)[0], [
      [utf8Spam, "span"],
      [utf8Eggs, "ham"],
    ]);
  });

  await t.step("entries()", () => {
    const textViewEntries = [...textView.entries()];
    const expectedTextViewEntries = [...textView.keys()]
      .map((key) => [key, textView.get(key)]);
    assertStrictEquals(textViewEntries.length, 3);
    assertEquals(textViewEntries, expectedTextViewEntries);

    const utf8ViewEntries = [...utf8View.entries()];
    const expectedUtf8ViewEntries = [...utf8View.keys()]
      .map((key) => [key, utf8View.get(key)]);
    assertStrictEquals(utf8ViewEntries.length, 3);
    assertEquals(utf8ViewEntries, expectedUtf8ViewEntries);
  });

  await t.step("forEach()", () => {
    let i = 0;
    const textViewKeys: Key[] = [];
    textView.forEach((value, key, dict) => {
      const expectedValue = textView.get(key);
      if (isDictionary(value) && isDictionary(expectedValue)) {
        assertDictionariesEqual(value, expectedValue);
      } else {
        assertStrictEquals(value, expectedValue);
      }
      assertStrictEquals(dict, textView);
      textViewKeys.push(key);
      i++;
    });
    assertArrayIncludes(textViewKeys, ["foo", "baz", "단팥"]);
    assertStrictEquals(i, 3);

    i = 0;
    const utf8ViewKeys: Key[] = [];
    utf8View.forEach((value, key, dict) => {
      const expectedValue = utf8View.get(key);
      if (isDictionary(value) && isDictionary(expectedValue)) {
        assertDictionariesEqual(value, expectedValue);
      } else {
        assertStrictEquals(value, expectedValue);
      }
      assertStrictEquals(dict, utf8View);
      utf8ViewKeys.push(key);
      i++;
    });
    assertArrayIncludes(utf8ViewKeys, [utf8Foo, utf8Baz, utf8단팥]);
    assertStrictEquals(i, 3);
  });

  await t.step("[Symbol.iterator]()", () => {
    assertEquals([...textView], [...textView.entries()]);
    assertEquals([...utf8View], [...utf8View.entries()]);
  });

  if (isDeno) {
    await t.step("[Deno.customInspect]()", async (t) => {
      const nodeInspect = Symbol.for("nodejs.util.inspect.custom");
      assert(nodeInspect in textView);
      assertInstanceOf(textView[nodeInspect], Function);
      assert(nodeInspect in utf8View);
      assertInstanceOf(utf8View[nodeInspect], Function);
      for (const compact of [true, false]) {
        for (const depth of [0, 1, 2, 3]) {
          for (const sorted of [true, false]) {
            for (const trailingComma of [true, false]) {
              const options = {
                compact,
                depth,
                sorted,
                trailingComma,
              };
              await assertSnapshot(t, Deno.inspect(textView, options));
              await assertSnapshot(t, Deno.inspect(utf8View, options));
              const nodeOptions = { ...options, trailingComma: false };
              assertEquals(
                textView[nodeInspect](depth, options, Deno.inspect),
                Deno.inspect(textView, nodeOptions),
              );
              assertEquals(
                utf8View[nodeInspect](depth, options, Deno.inspect),
                Deno.inspect(utf8View, nodeOptions),
              );
            }
          }
        }
      }
    });
  }
});
