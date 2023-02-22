import { areUint8ArraysEqual } from "./utils.ts";

/**
 * Represents a value which can be used as a key in a Bencodex dictionary.
 */
export type Key = string | Uint8Array;

/**
 * Represents a value which can be encoded in Bencodex.
 */
export type Value = null | boolean | bigint | Key | List | Dictionary;

/**
 * Represents a Bencodex list.
 */
export type List = readonly Value[];

/**
 * Represents a Bencodex dictionary.  It basically behaves like a read-only
 * `Map<Key, Value>`, but it is not necessarily a `Map` instance.
 */
export interface Dictionary extends Iterable<[Key, Value]> {
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
  entries(): Iterable<[Key, Value]>;

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
   * @see Dictionary.entries
   */
  [Symbol.iterator](): Iterator<[Key, Value]>;
}

/**
 * Checks if the given value can be used as a key in a Bencodex dictionary.
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
 *          they have the same contents, e.g., `areKeysEqual(1, 1)` returns
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
