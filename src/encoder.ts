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
 * Options for {@link encode} function.
 */
export interface EncodingOptions {
  /**
   * How to handle duplicate keys in dictionaries.  If omitted, defaults to
   * `"error"`.  If `"error"` is specified, a {@link RangeError} will be thrown
   * when a dictionary has duplicate keys.
   */
  onDuplicateKeys?: "error" | "useFirst" | "useLast";
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
 *
 * This function allocates a new buffer and returns the encoded bytes.  If you
 * want to encode a value into a pre-allocated buffer, use {@link encodeInto}
 * instead.
 *
 * @example Encoding a Bencodex list
 *
 * ```typescript
 * const encoded = encode([true, "spam"]);
 * console.log(encoded);
 * // Uint8Array(10) [ 0x6c, 0x74, 0x75, 0x34, 0x3a, 0x73, 0x70,
 * //                  0x61, 0x6d, 0x65 ]
 * ```
 *
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
  const size = estimateSize(value, { accuracy: "fastGuess" });
  const buffer = new Uint8Array(size);
  const { written } = encodeInto(value, buffer, {
    ...options,
    speculative: true,
  });
  return buffer.subarray(0, written);
}

/**
 * Options for {@link encodeInto} and {@link encodeKeyInto} functions.
 */
export interface NonAllocEncodingOptions extends EncodingOptions {
  /**
   * Whether to encode the value speculatively.  If omitted, defaults to
   * `false`.  If `true` is specified, the given buffer can be filled
   * some incorrect bytes when the encoding is not complete.  Even if
   * `true` is specified, the buffer will be filled with the correct bytes
   * when the encoding is complete.
   */
  speculative?: boolean;
}

/**
 * Encodes a value into the given buffer.
 *
 * This does not allocate a new buffer, and fills the given buffer with the
 * encoded value from the beginning.  If you want to fill the buffer from
 * somewhere else, pass a sliced subarray of the buffer to this function.
 *
 * @example Encoding a Bencodex list into a pre-allocated buffer
 *
 * ```typescript
 * const buffer = new Uint8Array(100);
 * const state = encodeInto(["foo", 123n], buffer);
 * if (!state.complete) console.error("Failed to encode the value");
 * else console.log(buffer.subarray(0, state.written));
 * // Uint8Array(13) [ 0x6c, 0x75, 0x33, 0x3a, 0x66, 0x6f, 0x6f, 0x69, 0x31,
 * //                  0x32, 0x33, 0x65, 0x65 ]
 * ```
 *
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
  options: NonAllocEncodingOptions = {},
): EncodingState {
  if (buffer.length < 1) return { written: 0, complete: false };
  if (value === null || typeof value === "boolean") {
    if (value === null) buffer[0] = nullAtom;
    else if (value === false) buffer[0] = falseAtom;
    else buffer[0] = trueAtom;
    return { written: 1, complete: true };
  }
  if (isKey(value)) return encodeKeyInto(value, buffer, options);
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
          options.onDuplicateKeys === "error" || options.onDuplicateKeys == null
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
        options,
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
 * @param options Encoding options.
 * @returns The object which indicates the number of bytes written into the
 *          buffer and whether the encoding is complete.
 * @throws {TypeError} When the given key is neither a `string` nor
 *         a {@link Uint8Array}.
 */
export function encodeKeyInto(
  key: Key,
  buffer: Uint8Array,
  options: NonAllocEncodingOptions = {},
): EncodingState {
  const bufferSize = buffer.length;
  if (typeof key === "string") {
    if (bufferSize < 1) return { written: 0, complete: false };
    buffer[0] = textPrefix;
    // deno-fmt-ignore
    const speculativeUtf8Length = options.speculative !== true
      ? estimateUtf8Length(key) : key.length <=    3
      ?      3
      :     10 <= key.length && key.length <=     33
      ?     33
      :    100 <= key.length && key.length <=    333
      ?    333
      :   1000 <= key.length && key.length <=   3333
      ?   3333
      :  10000 <= key.length && key.length <=  33333
      ?  33333
      : 100000 <= key.length && key.length <= 333333
      ? 333333
      : estimateUtf8Length(key);
    const lengthStr = speculativeUtf8Length.toString();
    const { written } = textEncoder.encodeInto(lengthStr, buffer.subarray(1));
    if (bufferSize < lengthStr.length + 2) {
      return { written: written + 1, complete: false };
    }
    buffer[written + 1] = textLengthDelimiter;
    const { written: contentWritten, read } = textEncoder.encodeInto(
      key,
      buffer.subarray(written + 2),
    );
    if (read < key.length) {
      return { written: written + 2 + contentWritten, complete: false };
    }
    if (contentWritten != speculativeUtf8Length) {
      // When size speculation is wrong, we need to update the length.
      textEncoder.encodeInto(contentWritten.toString(), buffer.subarray(1));
    }
    return { written: written + 2 + contentWritten, complete: true };
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
 * Options for size estimation functions, {@link estimateSize} and
 * {@link estimateKeySize}.
 */
export interface SizeEstimationOptions {
  /**
   * The strategy to deal with slow-to-estimate values.
   *
   * The `"bestEffort"`, which is the default, will try to estimate the size
   * of the value as * accurately as possible, but it may take longer time.
   *
   * The `"fastGuess"` will return a fast but inaccurate size estimation;
   * it is guaranteed to be greater than or equal to the actual size,
   * but it never be less than the  actual size, so that it is safe to
   * allocate a buffer with the returned size.
   */
  accuracy?: "bestEffort" | "fastGuess";
}

/**
 * Estimates the byte size of the given value in Bencodex.
 *
 * Note that this function does not guarantee the exact size of the value
 * when encoded in Bencodex, but it is guaranteed to be greater than or equal
 * to the actual size.  In particular, this function does not take into
 * account the size of the dictionary with duplicate keys.
 * @param value A Bencodex value to estimate the size.
 * @param options Options for size estimation.
 * @returns The estimated byte size of the given value.
 * @throws {TypeError} When the given value is not a valid Bencodex value.
 */
export function estimateSize(
  value: Value,
  options: SizeEstimationOptions = {},
): number {
  if (isKey(value)) return estimateKeySize(value, options);
  if (value === null || typeof value == "boolean") return 1;
  if (typeof value === "bigint") {
    const asciiSize = value.toString().length;
    return 1 + asciiSize + asciiSize.toString().length;
  }
  if (Array.isArray(value)) {
    let size = 2;
    for (const item of value) {
      size += estimateSize(item, options);
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
      size += estimateKeySize(key as unknown as Key, options);
      size += estimateSize(val, options);
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
 * Estimates the byte size of the given key in Bencodex.  It enables you to
 * determine the size of a Bencodex data without actually encoding it.
 * @param key A Bencodex dictionary key to estimate the size.
 * @param options Options for size estimation.
 * @returns The estimated byte size of the given key.
 * @throws {TypeError} When the given key is neither a `string` nor
 *         a {@link Uint8Array}.
 */
export function estimateKeySize(
  key: Key,
  options: SizeEstimationOptions = {},
): number {
  if (typeof key === "string") {
    const utf8Length = estimateUtf8Length(key, options);
    return 2 + utf8Length + utf8Length.toString().length;
  } else if (key instanceof Uint8Array) {
    return 1 + key.length + key.length.toString().length;
  }
  throw new TypeError(
    `Invalid key type: ${typeof key}; expected string or Uint8Array`,
  );
}

function estimateUtf8Length(text: string, options: SizeEstimationOptions = {}) {
  if (options.accuracy === "fastGuess" && text.length < 128) {
    return 3 * text.length;
  } else {
    // NOTE: The below code looks tricky, but it is actually the quickest way
    // to estimate the exact length of the UTF-8 encoded string, and it even
    // does not allocate any memory:
    return new Blob([text]).size;
  }
}
