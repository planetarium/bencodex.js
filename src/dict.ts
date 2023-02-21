import {
  decode,
  encode,
} from "https://deno.land/std@0.177.0/encoding/ascii85.ts";
import { Dictionary, Key, Value } from "./types.ts";
import { areUint8ArraysEqual } from "./utils.ts";

const SHORT_BINARY_THRESHOLD = 32;

/**
 * A {@link Dictionary} implementation that complies with the Bencodex
 * specification.  Unlike {@link Map}, this implementation allows only keys of
 * type {@link Key} and values of type {@link Value}, and in particular,
 * it actually compares {@link Uint8Array} keys by their contents instead of
 * their references.
 *
 * Note that this implementation does not guarantee the stable order of entries;
 * it can vary depending on the platform and the version of this library.
 */
export class BencodexDictionary implements Dictionary {
  readonly #stringKeys: Record<string, Value>;
  readonly #shortBinaryKeys: Record<string, Value>;
  readonly #longerBinaryKeys: [Uint8Array, Value][];
  readonly size;

  constructor(entries: Iterable<[Key, Value]> = []) {
    if (typeof entries !== "object" || !(Symbol.iterator in entries)) {
      throw new TypeError(
        `Expected an iterable, but got a ${typeof entries}`,
      );
    }
    this.#stringKeys = {};
    this.#shortBinaryKeys = {};
    this.#longerBinaryKeys = [];
    this.size = 0;
    for (const pair of entries) {
      if (!Array.isArray(pair) || pair.length < 2) {
        throw new TypeError(
          "Every entry must be a pair represented as an array of length 2, " +
            (Array.isArray(pair)
              ? `but got an array of length ${pair.length}`
              : `but got a ${typeof pair}`),
        );
      }
      const [key, value] = pair;
      if (typeof key === "string") {
        if (key in this.#stringKeys) this.size--;
        this.#stringKeys[key] = value;
      } else if (!(key instanceof Uint8Array)) {
        throw new TypeError(
          `Every key must be either string or Uint8Array, but got a ${(
            typeof key
          )}`,
        );
      } else if (key.length < SHORT_BINARY_THRESHOLD) {
        const encoded = encode(key);
        if (encoded in this.#shortBinaryKeys) this.size--;
        this.#shortBinaryKeys[encoded] = value;
      } else {
        let i = 0;
        for (const [k, _] of this.#longerBinaryKeys) {
          if (areUint8ArraysEqual(k, key)) {
            break;
          }

          i++;
        }
        if (i < this.#longerBinaryKeys.length) {
          this.#longerBinaryKeys[i] = [key, value];
          continue;
        }
        this.#longerBinaryKeys.push([key, value]);
      }

      this.size++;
    }
  }

  get(key: Key): Value | undefined {
    if (typeof key === "string") return this.#stringKeys[key];
    else if (key.length < SHORT_BINARY_THRESHOLD) {
      return this.#shortBinaryKeys[encode(key)];
    }
    for (const [k, v] of this.#longerBinaryKeys) {
      if (areUint8ArraysEqual(k, key)) return v;
    }
  }

  has(key: Key): boolean {
    if (typeof key === "string") return key in this.#stringKeys;
    else if (key.length < SHORT_BINARY_THRESHOLD) {
      return encode(key) in this.#shortBinaryKeys;
    }
    for (const [k] of this.#longerBinaryKeys) {
      if (areUint8ArraysEqual(k, key)) return true;
    }
    return false;
  }

  *keys(): Iterable<Key> {
    for (const key in this.#stringKeys) {
      yield key;
    }
    for (const key in this.#shortBinaryKeys) {
      yield decode(key);
    }
    for (const [key, _] of this.#longerBinaryKeys) {
      yield key;
    }
  }

  *values(): Iterable<Value> {
    for (const value of Object.values(this.#stringKeys)) {
      yield value;
    }
    for (const value of Object.values(this.#shortBinaryKeys)) {
      yield value;
    }
    for (const [_, value] of this.#longerBinaryKeys) {
      yield value;
    }
  }

  entries(): Iterable<[Key, Value]> {
    return this;
  }

  forEach(
    callback: (value: Value, key: Key, dictionary: Dictionary) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this.entries()) {
      callback.call(thisArg, value, key, this);
    }
  }

  *[Symbol.iterator](): Iterator<[Key, Value]> {
    for (const [key, value] of Object.entries(this.#stringKeys)) {
      yield [key, value];
    }
    for (const [key, value] of Object.entries(this.#shortBinaryKeys)) {
      yield [decode(key), value];
    }
    for (const pair of this.#longerBinaryKeys) {
      yield pair;
    }
  }

  [Symbol.for("Deno.customInspect")](inspect: (_: unknown) => string) {
    let s = "BencodexDictionary { ";
    let first = true;
    for (const [key, value] of this) {
      if (!first) s += ", ";
      s += `${inspect(key)}: ${inspect(value)}`;
      first = false;
    }
    s += " }";
    return s;
  }
}
