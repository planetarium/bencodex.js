/**
 * This module contains functions for encoding values into bytes.
 * @module
 */

import {
  areKeysEqual,
  compareKeys,
  isKey,
  type Key,
  type Value,
} from "./types.ts";
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

const textEncoder = new TextEncoder();

/**
 * Options for encoding.
 */
export interface EncodingOptions {
  /**
   * How to handle duplicate keys in dictionaries.  If omitted, defaults to
   * `"throw"`.  If `"throw"` is specified, a {@link RangeError} will be thrown
   * when a dictionary has duplicate keys.
   */
  onDuplicateKeys?: "throw" | "useFirst" | "useLast";
}

/**
 * Represents the end state of encoding.
 */
export interface EncodingState {
  /**
   * The number of bytes written into the buffer.
   */
  readonly written: number;

  /**
   * Whether the encoding is complete.
   *
   * If `true`, the encoding is complete and the buffer is filled with the
   * encoded value.
   *
   * If `false`, the encoding is not complete and the buffer is filled with
   * the encoded value as much as possible.  In this case, you should call
   * {@link encodeInto} again with the same value and a new larger buffer.
   */
  readonly complete: boolean;
}

/**
 * Encodes a Bencodex value and returns the encoded bytes.
 * @param value A Bencodex value to encode.
 * @param options Encoding options.
 * @returns The encoded bytes.
 * @throws {TypeError} When any value in the whole tree is not a valid Bencodex.
 * @throws {RangeError} When any {@link Dictionary} in the whole tree has
 *                      duplicate keys, and `options.onDuplicateKeys` is
 *                      `"throw"`.
 */
export function encode(
  value: Value,
  options: EncodingOptions = {},
): Uint8Array {
  const size = estimateSize(value);
  const buffer = new Uint8Array(size);
  const { written } = encodeInto(value, buffer, options);
  return buffer.subarray(0, written);
}

/**
 * Encodes a value into the given buffer.
 * @param value A value to encode.
 * @param buffer A buffer that the encoded value will be written into.  This
 *               buffer will be modified.
 * @param options Encoding options.
 * @returns The object which indicates the number of bytes written into the
 *          buffer and whether the encoding is complete.
 * @throws {TypeError} When any value in the whole tree is not a valid Bencodex.
 * @throws {RangeError} When any {@link Dictionary} in the whole tree has
 *                      duplicate keys, and `options.onDuplicateKeys` is
 *                      `"throw"`.
 */
export function encodeInto(
  value: Value,
  buffer: Uint8Array,
  options: EncodingOptions = {},
): EncodingState {
  if (buffer.length < 1) return { written: 0, complete: false };
  if (value === null || typeof value === "boolean") {
    if (value === null) buffer[0] = nullAtom;
    else if (value === false) buffer[0] = falseAtom;
    else buffer[0] = trueAtom;
    return { written: 1, complete: true };
  }
  if (isKey(value)) return encodeKeyInto(value, buffer);
  if (typeof value === "bigint") {
    buffer[0] = integerPrefix;
    const numericStr = value.toString();
    const { written } = textEncoder.encodeInto(numericStr, buffer.subarray(1));
    if (buffer.length < numericStr.length + 2) {
      return { written: written + 1, complete: false };
    }
    buffer[written + 1] = integerSuffix;
    return { written: written + 2, complete: true };
  }
  if (Array.isArray(value)) {
    buffer[0] = listPrefix;
    let totalWritten = 1;
    for (const item of value) {
      const { written, complete } = encodeInto(
        item,
        buffer.subarray(totalWritten),
        options,
      );
      totalWritten += written;
      if (!complete) return { written: totalWritten, complete: false };
    }
    if (buffer.length < totalWritten + 1) {
      return { written: totalWritten, complete: false };
    }
    buffer[totalWritten] = listSuffix;
    return { written: totalWritten + 1, complete: true };
  }
  if (value?.entries instanceof Function) {
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
    buffer[0] = dictionaryPrefix;
    let totalWritten = 1;
    let prevKey: Key | undefined;
    for (const [key, val] of entries) {
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
      const { written: keyWritten, complete: keyComplete } = encodeKeyInto(
        key,
        buffer.subarray(totalWritten),
      );
      totalWritten += keyWritten;
      if (!keyComplete) return { written: totalWritten, complete: false };
      const { written: valueWritten, complete: valueComplete } = encodeInto(
        val,
        buffer.subarray(totalWritten),
        options,
      );
      totalWritten += valueWritten;
      if (!valueComplete) return { written: totalWritten, complete: false };
      prevKey = key;
    }
    if (buffer.length < totalWritten + 1) {
      return { written: totalWritten, complete: false };
    }
    buffer[totalWritten] = dictionarySuffix;
    return { written: totalWritten + 1, complete: true };
  }
  if (typeof value === "number") {
    throw new TypeError(
      "Bencodex does not support floating-point numbers; use bigint instead",
    );
  }
  throw new TypeError(`Invalid value type: ${typeof value}`);
}

/**
 * Encodes a key into the given buffer.
 * @param key A key to encode.
 * @param buffer A buffer that the encoded key will be written into.  This
 *               buffer will be modified.
 * @returns The object which indicates the number of bytes written into the
 *          buffer and whether the encoding is complete.
 * @throws {TypeError} When the given key is neither a `string` nor
 *         a {@link Uint8Array}.
 */
export function encodeKeyInto(
  key: Key,
  buffer: Uint8Array,
): EncodingState {
  const bufferSize = buffer.length;
  if (typeof key === "string") {
    if (bufferSize < 1) return { written: 0, complete: false };
    buffer[0] = textPrefix;
    // NOTE: The below code looks tricky, but it is actually the quickest way
    // to estimate the length of the UTF-8 encoded string, and it even does
    // not allocate any memory:
    const utf8Length = new Blob([key]).size;
    const lengthStr = utf8Length.toString();
    const { written } = textEncoder.encodeInto(lengthStr, buffer.subarray(1));
    if (bufferSize < lengthStr.length + 2) {
      return { written: written + 1, complete: false };
    }
    buffer[written + 1] = textLengthDelimiter;
    const { written: contentWritten } = textEncoder.encodeInto(
      key,
      buffer.subarray(written + 2),
    );
    if (bufferSize < written + 2 + utf8Length) {
      return { written: written + 2 + contentWritten, complete: false };
    }
    return { written: written + 2 + utf8Length, complete: true };
  } else if (key instanceof Uint8Array) {
    const lengthStr = key.length.toString();
    const { written } = textEncoder.encodeInto(lengthStr, buffer);
    if (bufferSize < lengthStr.length + 1) return { written, complete: false };
    buffer[written] = binaryLengthDelimiter;
    buffer.set(key.subarray(0, buffer.length - 1 - written), 1 + written);
    if (buffer.length < 1 + written + key.length) {
      return { written: buffer.length, complete: false };
    }
    return { written: 1 + written + key.length, complete: true };
  } else {
    throw new TypeError(
      `Invalid key type: ${typeof key}; expected string or Uint8Array`,
    );
  }
}

/**
 * Estimates the byte size of the given value in Bencodex.
 *
 * Note that this function does not guarantee the exact size of the value
 * when encoded in Bencodex, but it is guaranteed to be greater than or equal
 * to the actual size.  In particular, this function does not take into
 * account the size of the dictionary with duplicate keys.
 * @param value A Bencodex value to estimate the size.
 * @returns The estimated byte size of the given value.
 * @throws {TypeError} When the given value is not a valid Bencodex value.
 */
export function estimateSize(value: Value): number {
  if (isKey(value)) return estimateKeySize(value);
  if (value === null || typeof value == "boolean") return 1;
  if (typeof value === "bigint") {
    const asciiSize = value.toString().length;
    return 1 + asciiSize + asciiSize.toString().length;
  }
  if (Array.isArray(value)) {
    let size = 2;
    for (const item of value) {
      size += estimateSize(item);
    }
    return size;
  }
  if (value?.entries instanceof Function) {
    let size = 2;
    for (const pair of value.entries()) {
      if (!Array.isArray(pair) || pair.length !== 2) {
        throw new TypeError(
          "Invalid dictionary; expected entries() to return " +
            "an iterable of [key, value] pairs",
        );
      }
      const [key, val] = pair;
      size += estimateKeySize(key as unknown as Key);
      size += estimateSize(val);
    }
    return size;
  }
  if (typeof value === "number") {
    throw new TypeError(
      "Bencodex does not support floating-point numbers; use bigint instead",
    );
  }
  throw new TypeError(`Invalid value type: ${typeof value}`);
}

/**
 * Estimates the byte size of the given key in Bencodex.
 * @param key A Bencodex dictionary key to estimate the size.
 * @returns The estimated byte size of the given key.
 * @throws {TypeError} When the given key is neither a `string` nor
 *         a {@link Uint8Array}.
 */
export function estimateKeySize(key: Key): number {
  if (typeof key === "string") {
    // NOTE: The below code looks tricky, but it is actually the quickest way
    // to estimate the length of the UTF-8 encoded string, and it even does
    // not allocate any memory:
    const utf8Length = new Blob([key]).size;
    return 2 + utf8Length + utf8Length.toString().length;
  } else if (key instanceof Uint8Array) {
    return 1 + key.length + key.length.toString().length;
  }
  throw new TypeError(
    `Invalid key type: ${typeof key}; expected string or Uint8Array`,
  );
}
