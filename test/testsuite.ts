import * as base64 from "std/encoding/base64.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { filter, map, toArray } from "aitertools";
import { Key, Value } from "../src/types.ts";
import { BencodexDictionary } from "../src/dict.ts";

type TestSuiteKey =
  | { type: "binary"; base64: string }
  | { type: "text"; value: string };
type TestSuiteTree =
  | { type: "null" }
  | { type: "boolean"; value: boolean }
  | { type: "integer"; decimal: string }
  | { type: "list"; values: TestSuiteTree[] }
  | { type: "dictionary"; pairs: { key: TestSuiteKey; value: TestSuiteTree }[] }
  | TestSuiteKey;

function parseTestSuiteKey(key: TestSuiteKey): Key {
  if (key.type === "text") return key.value;
  return base64.decode(key.base64);
}

function parseTestSuiteValue(tree: TestSuiteTree): Value {
  if (tree.type === "null") return null;
  if (tree.type === "boolean") return tree.value;
  if (tree.type === "integer") return BigInt(tree.decimal);
  if (tree.type === "list") return tree.values.map(parseTestSuiteValue);
  if (tree.type === "dictionary") {
    const pairs: [Key, Value][] = [];
    for (const { key, value } of tree.pairs) {
      pairs.push([parseTestSuiteKey(key), parseTestSuiteValue(value)]);
    }
    return new BencodexDictionary(pairs);
  }
  return parseTestSuiteKey(tree);
}

export interface TestCase {
  readonly encodingFile: string;
  readonly encoding: Uint8Array;
  readonly valueFile: string;
  readonly value: Value;
}

export async function getTestSuiteLoader(): Promise<
  undefined | (() => AsyncIterable<TestCase>)
> {
  const specDir = join(
    dirname(dirname(fromFileUrl(import.meta.url))),
    "spec",
    "testsuite",
  );
  let specDirExists = false;
  try {
    const specDirStat = await Deno.stat(specDir);
    specDirExists = specDirStat.isDirectory;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) specDirExists = false;
    else throw e;
  }
  if (!specDirExists) return undefined;

  return async function* () {
    let specFiles = await toArray(
      map(
        (e: Deno.DirEntry) => e.name,
        filter(
          (e: Deno.DirEntry) => !e.isDirectory && e.isFile,
          Deno.readDir(specDir),
        ),
      ),
    );
    specFiles = specFiles.filter((f) =>
      f.endsWith(".json") && specFiles.includes(f.replace(/\.json$/, ".dat"))
    );

    const encodingFiles: string[] = [];
    const readingEncodings: Promise<Uint8Array>[] = [];
    const readingTrees: Promise<Uint8Array>[] = [];
    for (const valueFile of specFiles) {
      const encodingFile = valueFile.replace(/\.json$/, ".dat");
      encodingFiles.push(encodingFile);
      readingEncodings.push(Deno.readFile(join(specDir, encodingFile)));
      readingTrees.push(Deno.readFile(join(specDir, valueFile)));
    }

    const encodings = await Promise.all(readingEncodings);
    const trees = await Promise.all(readingTrees);
    const textDecoder = new TextDecoder("utf-8");
    for (let i = 0; i < specFiles.length; i++) {
      const encodingFile = encodingFiles[i];
      const encoding = encodings[i];
      const valueFile = specFiles[i];
      const tree = JSON.parse(textDecoder.decode(trees[i]));
      const value = parseTestSuiteValue(tree);
      yield { encoding, encodingFile, value, valueFile };
    }
  };
}
