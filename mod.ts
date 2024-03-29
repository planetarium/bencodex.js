/**
 * This façade module exports the public API of this package.
 *
 * @example Encoding a Bencodex dictionary and decoding it back
 *
 * ```typescript
 * const encoded = encode(new Map([["foo", 123n]]));
 * const decoded = decode(encoded);
 * ```
 *
 * @module
 */
export {
  decode,
  decodeValue,
  DecodingError,
  type DecodingErrorKind,
  type DecodingOptions,
  type DecodingState,
} from "./src/decoder.ts";
export {
  encode,
  encodeInto,
  type EncodingOptions,
  estimateSize,
  type NonAllocEncodingOptions,
  type SizeEstimationOptions,
} from "./src/encoder.ts";
export {
  areDictionariesEqual,
  areKeysEqual,
  areValuesEqual,
  type Dictionary,
  isDictionary,
  isKey,
  type Key,
  type Value,
} from "./src/types.ts";
export {
  BencodexDictionary,
  isRecordValue,
  type RecordValue,
  RecordView,
} from "./src/dict.ts";
