/**
 * This façade module exports the public API of this package.
 * @module
 */
export { encodeInto, estimateSize } from "./src/encoder.ts";
export {
  areKeysEqual,
  type Dictionary,
  isKey,
  type Key,
  type Value,
} from "./src/types.ts";
export { BencodexDictionary } from "./src/dict.ts";
