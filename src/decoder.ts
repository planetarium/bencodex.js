import { compareKeys, Dictionary, Key, Value } from "./types.ts";
import {
  binaryLengthDelimiter,
  dictionaryPrefix,
  dictionarySuffix,
  falseAtom,
  integerMinusSign,
  integerPrefix,
  integerSuffix,
  listPrefix,
  listSuffix,
  nullAtom,
  textLengthDelimiter,
  textPrefix,
  trueAtom,
} from "./consts.ts";
import { decodeAsciiNaturalNumber } from "./utils.ts";
import { BencodexDictionary } from "./dict.ts";

const textDecoder = new TextDecoder();

/**
 * Options for decoding a Bencodex value.
 */
export interface StatefulDecodingOptions {
  /**
   * Whether to silently ignore or stop decoding and report an error when
   * dictionary keys are not ordered according to the Bencodex specification.
   * The default value is `"error"`.
   *
   * When this option is set to `"ignore"` and the decoder encounters
   * duplicate dictionary keys, the behavior is undefined and depends on the
   * implementation of the `dictionaryConstructor`.  In case of
   * {@link BencodexDictionary} (default), the key appeared the latest will be
   * used.
   */
  onInvalidKeyOrder?: "error" | "ignore";
  /**
   * The {@link Dictionary} type to use for representing decoded dictionaries.
   * The default value is {@link BencodexDictionary}.  You can set this option
   * to other implementations of {@link Dictionary} such as `Map<Key, Value>`.
   */
  dictionaryConstructor?: new (entries: Iterable<[Key, Value]>) => Dictionary;
}

/**
 * Represents the end-state of decoding.
 * @typeParam T The type of the decoded value.
 * @typeParam E The type of the error.
 */
export type DecodingState<T, E> =
  | {
    /** Whether it is successful.  It's always `true` in this case. */
    success: true;
    /** The number of read bytes.  It's always greater than 0 in this case. */
    read: number;
    /** The decoded value. */
    value: T;
  }
  | {
    /** Whether it is successful.  It's always `false` in this case. */
    success: false;
    /** The number of read bytes. */
    read: number;
    /** The kind of error. */
    error: E;
  };

/**
 * Represents an error that can occur while decoding a Bencodex value.
 */
export type DecodingError =
  | KeyDecodingError
  /** The case where an unexpected byte is encountered. */
  | "unexpectedByte"
  /**
   * The case where an integer value is expected but non-ASCII digits are
   * encountered.
   */
  | "invalidInteger"
  /** The case where an integer value is expected but no suffix byte follows. */
  | "noIntegerSuffix"
  /** The case where a list value is expected but no suffix byte follows. */
  | "noListSuffix"
  /**
   * The case where a dictionary value is expected but no suffix byte follows.
   */
  | "noDictionarySuffix"
  /**
   * The case where dictionary keys are not ordered according to the Bencodex
   * specification.
   */
  | "unorderedDictionaryKeys"
  /** The case where there are duplicate dictionary keys. */
  | "duplicateDictionaryKeys";

/**
 * Decodes a Bencodex value from the given buffer.
 *
 * Note that this function does not check whether the given buffer is entirely
 * consumed.  You should check the returned {@link DecodingState.read} value
 * by yourself to see if the buffer is entirely consumed.
 * @param buffer The buffer that starts with encoded Bencodex bytes.
 * @param options Options for decoding.
 * @returns An object that represents the end-state of decoding.
 */
export function decodeValue(
  buffer: Uint8Array,
  options: StatefulDecodingOptions = {},
): DecodingState<Value, DecodingError> {
  if (buffer.length < 1) {
    return { success: false, read: 0, error: "unexpectedEndOfInput" };
  }
  const firstByte = buffer[0];
  if (firstByte === textPrefix || 0x30 <= firstByte && firstByte <= 0x39) {
    return decodeKey(buffer);
  }
  if (firstByte === nullAtom) return { success: true, read: 1, value: null };
  if (firstByte === falseAtom) return { success: true, read: 1, value: false };
  if (firstByte === trueAtom) return { success: true, read: 1, value: true };
  if (firstByte === integerPrefix) {
    let read = 1;
    let sign = 1n;
    if (buffer[read] == integerMinusSign) {
      sign = -1n;
      read++;
    }
    const endState = decodeAsciiNaturalNumber(buffer.subarray(read), "bigint");
    read += endState.read;
    if (!endState.success) {
      return { ...endState, read, error: "invalidInteger" };
    }
    if (buffer[read] != integerSuffix) {
      return { success: false, read, error: "noIntegerSuffix" };
    }
    read++;
    return { success: true, read, value: endState.value * sign };
  }
  if (firstByte === listPrefix) {
    let read = 1;
    const value: Value[] = [];
    while (read < buffer.length && buffer[read] !== listSuffix) {
      const endState = decodeValue(buffer.subarray(read), options);
      read += endState.read;
      if (!endState.success) return { ...endState, read };
      value.push(endState.value);
    }
    if (read >= buffer.length) {
      return { success: false, read, error: "noListSuffix" };
    }
    read++;
    return { success: true, read, value };
  }
  if (firstByte === dictionaryPrefix) {
    let read = 1;
    const pairs: [Key, Value][] = [];
    const onInvalidKeyOrder = options.onInvalidKeyOrder ?? "error";
    const dictCtor = options.dictionaryConstructor ?? BencodexDictionary;
    let prevKey: Key | undefined;
    while (read < buffer.length && buffer[read] !== dictionarySuffix) {
      const keyDecodingState = decodeKey(buffer.subarray(read));
      read += keyDecodingState.read;
      if (!keyDecodingState.success) return { ...keyDecodingState, read };
      if (onInvalidKeyOrder !== "ignore") {
        if (typeof prevKey !== "undefined") {
          const cmp = compareKeys(prevKey, keyDecodingState.value);
          if (cmp > 0) {
            return { success: false, read, error: "unorderedDictionaryKeys" };
          } else if (cmp === 0) {
            return { success: false, read, error: "duplicateDictionaryKeys" };
          }
        }
        prevKey = keyDecodingState.value;
      }
      const valDecodingState = decodeValue(buffer.subarray(read), options);
      read += valDecodingState.read;
      if (!valDecodingState.success) return { ...valDecodingState, read };
      pairs.push([keyDecodingState.value, valDecodingState.value]);
    }
    if (read >= buffer.length) {
      return { success: false, read, error: "noDictionarySuffix" };
    }
    read++;
    return { success: true, read, value: new dictCtor(pairs) };
  }
  return { success: false, read: 0, error: "unexpectedByte" };
}

/**
 * Represents an error that may occur during decoding Bencodex keys.
 */
export type KeyDecodingError =
  /** The case where more bytes are expected but no more bytes in the input. */
  | "unexpectedEndOfInput"
  /**
   * The case where a text value is expected but no text delimiter byte comes.
   */
  | "noTextDelimiter"
  /** The case where a text value is expected but no text length comes. */
  | "noTextLength"
  /**
   * The case where a specified text length is greater than the remaining bytes.
   */
  | "overRunTextLength"
  /**
   * The case where a binary value is expected but no binary delimiter byte
   * comes.
   */
  | "noBinaryDelimiter"
  /** The case where a binary value is expected but no binary length comes. */
  | "noBinaryLength"
  /**
   * The case where a specified binary length is greater than the remaining
   * bytes.
   */
  | "overRunBinaryLength";

/**
 * Decodes a Bencodex key from the given buffer.
 *
 * Note that this function does not check whether the given buffer is entirely
 * consumed.  You should check the returned {@link DecodingState.read} value
 * by yourself to see if the buffer is entirely consumed.
 * @param buffer The buffer that starts with encoded Bencodex key bytes.
 * @returns An object that represents the end-state of decoding.
 */
export function decodeKey(
  buffer: Uint8Array,
): DecodingState<Key, KeyDecodingError> {
  let read = 0;
  if (buffer.length < 1) {
    return { success: false, read, error: "unexpectedEndOfInput" };
  } else if (buffer[0] === textPrefix) {
    read++;
    const parsed = decodeAsciiNaturalNumber(buffer.subarray(1), "number");
    if (!parsed.success) return { success: false, read, error: "noTextLength" };
    read += parsed.read;
    const byteSize = parsed.value;
    if (buffer[read] !== textLengthDelimiter) {
      return { success: false, read, error: "noTextDelimiter" };
    }
    read++;
    if (read + byteSize > buffer.length) {
      return {
        success: false,
        read: buffer.length,
        error: "overRunTextLength",
      };
    }
    // TODO: Research on "stream" option:
    const value = textDecoder.decode(buffer.subarray(read, read + byteSize));
    read += byteSize;
    return { success: true, read, value };
  }
  const parsed = decodeAsciiNaturalNumber(buffer, "number");
  if (!parsed.success) return { success: false, read, error: "noBinaryLength" };
  read += parsed.read;
  const byteSize = parsed.value;
  if (buffer[read] !== binaryLengthDelimiter) {
    return { success: false, read, error: "noBinaryDelimiter" };
  }
  read++;
  if (read + byteSize > buffer.length) {
    return {
      success: false,
      read: buffer.length,
      error: "overRunBinaryLength",
    };
  }
  const value = buffer.subarray(read, read + byteSize);
  read += byteSize;
  return { success: true, read, value };
}
