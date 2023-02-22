import { areKeysEqual, isKey, Key, Value } from "./types.ts";
import {
  binaryLengthDelimiter,
  dictionaryPrefix,
  dictionarySuffix,
  falseAtom,
  integerPrefix,
  integerSuffix,
  listPrefix,
  listSuffix,
  nullAtom,
  textLengthDelimiter,
  textPrefix,
  trueAtom,
} from "./consts.ts";
import { compareUint8Arrays } from "./utils.ts";

const textEncoder = new TextEncoder();

/**
 * Options for encoding.
 */
export interface EncodingOptions {
  /**
   * How to handle duplicate keys in dictionaries.  If omitted, defaults to
   * `"throw"`.
   */
  onDuplicateKeys?: "throw" | "useFirst" | "useLast";
}

/**
 * Encodes a value into chunks of bytes.
 * @param value A value to encode.
 * @param options Encoding options.
 */
export function* encodeIntoChunks(
  value: Value,
  options: EncodingOptions = {},
): Iterable<Uint8Array> {
  if (isKey(value)) yield* encodeKeyIntoChunks(value);
  else if (value === null) yield new Uint8Array([nullAtom]);
  else if (value === false) yield new Uint8Array([falseAtom]);
  else if (value === true) yield new Uint8Array([trueAtom]);
  else if (typeof value === "bigint") {
    yield new Uint8Array([integerPrefix]);
    yield textEncoder.encode(value.toString());
    yield new Uint8Array([integerSuffix]);
  } else if (Array.isArray(value)) {
    yield new Uint8Array([listPrefix]);
    for (const item of value) yield* encodeIntoChunks(item);
    yield new Uint8Array([listSuffix]);
  } else if (value?.entries instanceof Function) {
    yield new Uint8Array([dictionaryPrefix]);
    const entries: [Key, Value, number][] = [];
    let i = 0;
    for (const pair of value.entries()) {
      if (!Array.isArray(pair) || pair.length < 2) {
        throw new TypeError(
          "Invalid dictionary entries; expected 2-element arrays",
        );
      }
      if (!isKey(pair[0])) {
        throw new TypeError(
          "Invalid dictionary keys; expected strings or Uint8Arrays",
        );
      }
      entries.push([pair[0] as Key, pair[1], i]);
      i++;
    }
    entries.sort((a, b) => {
      const [keyA, _valA, idxA] = a;
      const [keyB, _valB, idxB] = b;
      const cmp = compareKeys(keyA, keyB);
      if (cmp === 0) {
        return options.onDuplicateKeys === "useLast"
          ? idxB - idxA
          : idxA - idxB;
      }
      return cmp;
    });
    let prevKey: Key | undefined;
    for (const [key, value] of entries) {
      if (prevKey != null && areKeysEqual(key, prevKey)) {
        if (
          options.onDuplicateKeys === "throw" || options.onDuplicateKeys == null
        ) {
          throw new RangeError("Invalid dictionary keys; duplicate keys found");
        } else if (
          options.onDuplicateKeys === "useFirst" ||
          options.onDuplicateKeys === "useLast"
        ) {
          continue;
        }
      }
      yield* encodeKeyIntoChunks(key);
      yield* encodeIntoChunks(value);
      prevKey = key;
    }
    yield new Uint8Array([dictionarySuffix]);
  } else if (typeof value === "number") {
    throw new TypeError(
      "Bencodex does not support floating-point numbers; use bigint instead",
    );
  } else throw new TypeError(`Invalid value type: ${typeof value}`);
}

/**
 * Compares two keys in the specified order in the Bencodex specification.
 * @param a A key to compare.
 * @param b Another key to compare.
 * @returns A negative number if `a` is former than `b`, zero if `a` is equal to
 *         `b`, or a positive number if `a` is latter than `b`.
 * @throws {TypeError} When any of the given keys is neither a `string` nor
 *         a {@link Uint8Array}.
 */
export function compareKeys(a: Key, b: Key): number {
  if (typeof a === "string") {
    if (typeof b === "string") return a < b ? -1 : a === b ? 0 : 1;
    else if (b instanceof Uint8Array) return 1;
    throw new TypeError(`Invalid key type: ${typeof b}`);
  } else if (a instanceof Uint8Array) {
    if (typeof b === "string") return -1;
    else if (b instanceof Uint8Array) return compareUint8Arrays(a, b);
    throw new TypeError(`Invalid key type: ${typeof b}`);
  }
  throw new TypeError(`Invalid key type: ${typeof a}`);
}

/**
 * Encodes a key into chunks.
 * @param key A key to encode.
 * @returns An iterable of chunks.
 * @throws {TypeError} When the given key is neither a `string` nor
 *         a {@link Uint8Array}.
 */
export function* encodeKeyIntoChunks(key: Key): Iterable<Uint8Array> {
  if (typeof key === "string") {
    yield new Uint8Array([textPrefix]);
    const encoded = textEncoder.encode(key);
    yield textEncoder.encode(encoded.length.toString());
    yield new Uint8Array([textLengthDelimiter]);
    yield encoded;
  } else if (key instanceof Uint8Array) {
    yield textEncoder.encode(key.length.toString());
    yield new Uint8Array([binaryLengthDelimiter]);
    yield key;
  } else {
    throw new TypeError(
      `Invalid key type: ${typeof key}; expected string or Uint8Array`,
    );
  }
}
