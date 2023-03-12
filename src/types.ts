/**
 * This module provides a basic type definitions for Bencodex, and some utility
 * functions for them.
 *
 * @module
 */

import { BencodexDictionary } from "./dict.ts";
import { areUint8ArraysEqual, compareUint8Arrays } from "./utils.ts";

/**
 * Represents a value which can be used as a key in a Bencodex dictionary.
 * It is either a string ("text" in Bencodex) or a `Unit8Array` instance
 * ("binary" in Bencodex).
 *
 * Note that every {@link Key} is also a {@link Value} (not vice versa).
 *
 * Here are examples of valid {@link Key} values:
 *
 * ```typescript
 * let text: Key = "key";
 * let binary: Key = new Uint8Array([0x6b, 0x65, 0x79]);
 * ```
 */
export type Key = string | Uint8Array;

/**
 * Represents a value which can be encoded in Bencodex.  Each data type in
 * Bencodex has its corresponding type in JavaScript:
 *
 * - `null` represents Bencodex's null
 * - `boolean` represents Bencodex's Boolean
 * - `bigint` represents Bencodex's integer (note that `number` is not a valid
 *   type for Bencodex's integer)
 * - `string` represents Bencodex's text
 * - `Uint8Array` represents Bencodex's binary
 * - `Value[]` represents Bencodex's list
 * - {@link Dictionary} represents Bencodex's dictionary (note that it is not
 *   a concrete type, but an interface)
 *
 * Here are examples of valid {@link Value}s:
 *
 * ```typescript
 * let null_: Value = null;
 * let bool: Value = true;
 * let integer: Value = 123n;  // note that it ends with suffix `n`
 * let text: Value = "value";
 * let binary: Value = new Uint8Array([0x76, 0x61, 0x6c, 0x75, 0x65]);
 * let list: Value = [
 *   null,
 *   true,
 *   123n,
 *   "value",
 *   new Uint8Array([0x76, 0x61, 0x6c, 0x75, 0x65]),
 *   [],
 *   new Map(),
 * ];
 * let dictionary: Value = new Map([
 *   ["string key", list],
 *   [new Uint8Array([0x6b, 0x65, 0x79]), "<- binary key"]
 * ]);
 * ```
 */
export type Value = null | boolean | bigint | Key | List | Dictionary;

/**
 * Represents a Bencodex list.  It basically is a read-only `Value[]`.
 */
export type List = readonly Value[];

/**
 * Represents a Bencodex dictionary.  It basically behaves like a read-only
 * `Map<Key, Value>`, but it is not necessarily a `Map` instance.
 *
 * @see {@link BencodexDictionary}
 * @see {@link RecordView}
 */
export interface Dictionary extends Iterable<readonly [Key, Value]> {
  /**
   * The number of key-value pairs in this dictionary.
   */
  readonly size: number;

  /**
   * Gets the value associated with the given key.
   * @param key The key to get the value associated with.
   * @returns The value associated with the given key, or `undefined` if the
   *         given key is not present in this dictionary.
   */
  get(key: Key): Value | undefined;

  /**
   * Checks if the given key is present in this dictionary.
   * @param key The key to check.
   * @returns `true` iff the given key is present in this dictionary.
   */
  has(key: Key): boolean;

  /**
   * Gets an iterable object which iterates over the keys in this dictionary.
   * @returns An iterable object which iterates over the keys in this
   *          dictionary.
   */
  keys(): Iterable<Key>;

  /**
   * Gets an iterable object which iterates over the values in this dictionary.
   * @returns An iterable object which iterates over the values in this
   *          dictionary.
   */
  values(): Iterable<Value>;

  /**
   * Gets an iterable object which iterates over the key-value pairs in this
   * dictionary.  This method is equivalent to `Dictionary[Symbol.iterator]()`.
   * @returns An iterable object which iterates over the key-value pairs in
   *          this dictionary.
   */
  entries(): Iterable<readonly [Key, Value]>;

  /**
   * Calls the given callback function for each key-value pair in this
   * dictionary.
   * @param callback The callback function to call for each key-value pair.
   *                 This function is called with three arguments: the value,
   *                 the key, and the dictionary itself.
   * @param thisArg The value to use as `this` when calling the callback
   *                function.
   */
  forEach(
    callback: (value: Value, key: Key, dictionary: Dictionary) => void,
    thisArg?: unknown,
  ): void;

  /**
   * Gets an iterator which iterates over the key-value pairs in this
   * dictionary.  This method is equivalent to `Dictionary.entries()`.
   * @returns An iterator which iterates over the key-value pairs in this
   *          dictionary.
   * @see {@link Dictionary.entries}
   */
  [Symbol.iterator](): Iterator<readonly [Key, Value]>;
}

/**
 * Checks if the given value is a Bencodex dictionary.
 *
 * In TypeScript, this function can be used as a type guard.
 * @param value The value to check.
 * @returns `true` iff the given value is a Bencodex dictionary.
 */
export function isDictionary(value: unknown): value is Dictionary {
  return (
    typeof value === "object" && value != null &&
    "size" in value && typeof value.size === "number" &&
    "get" in value && typeof value.get === "function" &&
    "has" in value && typeof value.has === "function" &&
    "keys" in value && typeof value.keys === "function" &&
    "values" in value && typeof value.values === "function" &&
    "entries" in value && typeof value.entries === "function" &&
    "forEach" in value && typeof value.forEach === "function" &&
    Symbol.iterator in value && typeof value[Symbol.iterator] === "function"
  );
}

/**
 * Checks if the given value can be used as a key in a Bencodex dictionary.
 *
 * In TypeScript, this function can be used as a type guard.
 * @param value The value to check.
 * @returns `true` iff the given value can be used as a key in a Bencodex
 *          dictionary.
 */
export function isKey(value: unknown): value is Key {
  return typeof value === "string" || value instanceof Uint8Array;
}

/**
 * Checks if the given keys have the same type and the same contents.  In other
 * words, this function checks if the given keys are encoded in the same
 * Bencodex data.
 * @param a A key to compare.
 * @param b Another key to compare.
 * @returns `true` iff the given keys have the same type and the same contents.
 *          It returns `false` when the given keys have invalid types even if
 *          they have the same contents, e.g., `areKeysEqual(1n, 1n)` returns
 *          `false`.
 */
export function areKeysEqual(a: Key, b: Key): boolean {
  if (typeof a === "string") {
    return typeof b === "string" && a === b;
  } else if (a instanceof Uint8Array) {
    return b instanceof Uint8Array && areUint8ArraysEqual(a, b);
  }
  return false;
}

/**
 * Compares two keys in the specified order in the Bencodex specification.
 *
 * This function can be passed to `Array.prototype.sort()` to sort keys in the
 * order specified in the Bencodex specification.
 * @param a A key to compare.
 * @param b Another key to compare.
 * @returns A negative number if `a` is former than `b`, zero if `a` is equal to
 *         `b`, or a positive number if `a` is latter than `b`.
 * @throws {TypeError} When any of the given keys is neither a `string` nor
 *         a `Uint8Array`.
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
 * Checks if the given Bencodex dictionaries have the same keys and the same
 * associated values.  In other words, this function checks if the given
 * dictionaries are encoded in the same Bencodex data.
 * @param a A dictionary to compare.
 * @param b Another dictionary to compare.
 * @returns `true` iff the given dictionaries have the same keys and the same
 *          associated values.  It returns `false` when the given dictionaries
 *          have invalid types even if they have the same keys and the same
 *          associated values, e.g., `areDictionariesEqual(1n, 1n)` returns
 *          `false`.
 */
export function areDictionariesEqual(a: Dictionary, b: Dictionary): boolean {
  if (!isDictionary(a) || !isDictionary(b)) return false;
  if (a.size !== b.size) return false;
  let otherEntries: undefined | (readonly [Key, Value])[];
  for (const [key, value] of a) {
    if (typeof key === "string") {
      const otherValue = b.get(key);
      if (typeof otherValue === "undefined") return false;
      if (!areValuesEqual(value, otherValue)) return false;
    } else {
      let otherValue = b.get(key);
      // As not every Dictionary implementation guarantees they compare binary
      // keys by their contents rather than by their references (e.g., Map),
      // we can't rely on their get() or has() methods for binary keys:
      if (typeof otherValue === "undefined") {
        if (otherEntries === undefined) otherEntries = [...b.entries()];
        for (const [bKey, bVal] of otherEntries) {
          if (areKeysEqual(key, bKey)) {
            otherValue = bVal;
            break;
          }
        }
      }
      if (typeof otherValue === "undefined") return false;
      if (!areValuesEqual(value, otherValue)) return false;
    }
  }
  return true;
}

/**
 * Checks if the given Bencodex values have the same type and the same contents.
 * In other words, this function checks if the given values are encoded in the
 * same Bencodex data.
 * @param a A Bencodex value to compare.
 * @param b Another Bencodex value to compare.
 * @returns `true` iff the given values have the same type and the same
 *          contents.  It returns `false` when the given values have invalid
 *          types even if they have the same contents, e.g., `areValuesEqual(1,
 *          1)` returns `false` (since `number`s are not a valid Bencodex type).
 */
export function areValuesEqual(a: Value, b: Value): boolean {
  if (a === null && b === null) return true;
  if (
    typeof a === "boolean" && typeof b === "boolean" ||
    typeof a === "bigint" && typeof b === "bigint"
  ) return a === b;
  if (isKey(a) && isKey(b)) return areKeysEqual(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => areValuesEqual(v, b[i]));
  }
  // Note that areDictionariesEqual() checks the types of the given values
  // at runtime, and it returns false when the given values aren't dictionaries:
  return areDictionariesEqual(
    a as unknown as Dictionary,
    b as unknown as Dictionary,
  );
}
