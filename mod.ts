/**
 * This façade module exports the public API of this package.
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
} from "./src/encoder.ts";
export {
  areKeysEqual,
  type Dictionary,
  isKey,
  type Key,
  type Value,
} from "./src/types.ts";
export { BencodexDictionary } from "./src/dict.ts";
