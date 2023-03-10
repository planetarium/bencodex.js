/**
 * This module provides a {@link BencodexDictionary} class which implements
 * {@link Dictionary} interface.  Although an encoder can take any object
 * implementing the {@link Dictionary} interface (e.g., a `Map` object),
 * a decoder always represents a Bencodex dictionary as
 * a {@link BencodexDictionary} so that it can guarantee the sensible behavior
 * according to the Bencodex specification.
 *
 * @module
 */

import {
  decode,
  encode,
} from "https://deno.land/std@0.177.0/encoding/base64.ts";
import {
  compareKeys,
  type Dictionary,
  isDictionary,
  type Key,
  type Value,
} from "./types.ts";
import { areUint8ArraysEqual } from "./utils.ts";

function inspectDictionary(
  dictionary: Dictionary,
  typeName: string,
  inspect: (_: unknown, options: unknown) => string,
  options: {
    compact: boolean;
    depth: number;
    sorted: boolean;
    trailingComma: boolean;
  },
) {
  let s = `${typeName}(${dictionary.size})`;
  if (options.depth < 1) return `[${s}]`;
  const nextOptions = { ...options, depth: options.depth - 1 };
  const entries: (readonly [Key, Value])[] = [...dictionary];
  if (options.sorted) entries.sort(([a], [b]) => compareKeys(a, b));
  const entryStrings = entries.map(
    ([k, v]) => [inspect(k, nextOptions), inspect(v, nextOptions)],
  );
  const compact = options.compact &&
    !entryStrings.some(([k, v]) => k.includes("\n") || v.includes("\n"));
  s += compact ? " { " : " {\n";
  let first = true;
  for (const [key, value] of entryStrings) {
    if (!first) s += compact ? ", " : ",\n";
    if (!compact) s += "  ";
    s += `${key.replaceAll("\n", "\n  ")} => ${value.replaceAll("\n", "\n  ")}`;
    first = false;
  }
  if (options.trailingComma && !compact) s += ",";
  s += compact ? " }" : "\n}";
  return s;
}

const SHORT_BINARY_THRESHOLD = 32;

/**
 * A {@link Dictionary} implementation that complies with the Bencodex
 * specification.  Unlike `Map`, this implementation allows only keys of
 * type {@link Key} and values of type {@link Value}, and in particular,
 * it actually compares `Uint8Array` keys by their contents instead of
 * their references.
 *
 * Note that this implementation does not guarantee the stable order of entries;
 * it can vary depending on the platform and the version of this library.
 *
 * @example Constructing a dictionary
 *
 * ```typescript
 * const dict = new BencodexDictionary([
 *   ["foo", 123n],
 *   ["bar", "baz"],
 * ]);
 * ```
 */
export class BencodexDictionary implements Dictionary {
  readonly #stringKeys: Record<string, Value>;
  readonly #shortBinaryKeys: Record<string, Value>;
  readonly #longerBinaryKeys: (readonly [Uint8Array, Value])[];

  /** {@inheritDoc Dictionary.size} */
  readonly size;

  /**
   * Creates a new {@link BencodexDictionary} instance.
   * @param entries An iterable object which yields key-value pairs to be
   *                inserted into the new dictionary.  If omitted, an empty
   *                dictionary is created.
   * @throws {TypeError} When the given `entries` is not an iterable object or
   *                     when it yields a non-pair value.
   */
  constructor(entries: Iterable<readonly [Key, Value]> = []) {
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

  /** {@inheritDoc Dictionary.get} */
  get(key: Key): Value | undefined {
    if (typeof key === "string") return this.#stringKeys[key];
    else if (key.length < SHORT_BINARY_THRESHOLD) {
      return this.#shortBinaryKeys[encode(key)];
    }
    for (const [k, v] of this.#longerBinaryKeys) {
      if (areUint8ArraysEqual(k, key)) return v;
    }
  }

  /** {@inheritDoc Dictionary.has} */
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

  /** {@inheritDoc Dictionary.keys} */
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

  /** {@inheritDoc Dictionary.values} */
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

  /** {@inheritDoc Dictionary.entries} */
  entries(): Iterable<readonly [Key, Value]> {
    return this;
  }

  /** {@inheritDoc Dictionary.forEach} */
  forEach(
    callback: (value: Value, key: Key, dictionary: Dictionary) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this.entries()) {
      callback.call(thisArg, value, key, this);
    }
  }

  /**
   * Gets an iterator which iterates over the key-value pairs in this
   * dictionary.  This method is equivalent to `Dictionary.entries()`.
   * @returns An iterator which iterates over the key-value pairs in this
   *          dictionary.
   * @see {@link BencodexDictionary.entries}
   */
  *[Symbol.iterator](): Iterator<readonly [Key, Value]> {
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

  [Symbol.for("Deno.customInspect")](
    inspect: (_: unknown, options: unknown) => string,
    options: {
      compact: boolean;
      depth: number;
      sorted: boolean;
      trailingComma: boolean;
    },
  ): string {
    return inspectDictionary(this, "BencodexDictionary", inspect, options);
  }

  [Symbol.for("nodejs.util.inspect.custom")](
    _: number,
    options: {
      compact: number | boolean;
      depth: number;
      sorted: boolean;
    },
    inspect: (_: unknown, options: unknown) => string,
  ): string {
    return inspectDictionary(this, "BencodexDictionary", inspect, {
      ...options,
      compact: options.compact !== false,
      trailingComma: false,
    });
  }
}

/**
 * A record object that represents a Bencodex dictionary.
 *
 * Note that its values can be either {@link Value} or {@link RecordValue}
 * recursively.
 *
 * Here's an example of a valid {@link RecordValue}:
 *
 * ```typescript
 * let record: Record = {
 *   "key": "value",
 *   "nested": {
 *     "key": "value",
 *   },
 * };
 * ```
 */
export interface RecordValue {
  [key: string]: Value | RecordValue;
}

/**
 * A type guard predicate that checks if the given value is
 * a {@link RecordValue}.
 * @param value The value to check.
 * @returns `true` iff the given value is a {@link RecordValue}.
 */
export function isRecordValue(
  value: Value | RecordValue,
): value is RecordValue {
  return typeof value === "object" &&
    value != null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array) &&
    !isDictionary(value);
}

/**
 * A view of a {@link RecordValue} that implements {@link Dictionary}.  It is
 * a handy way to construct a {@link Dictionary} using JavaScript's object
 * literal syntax.
 *
 * @example Constructing a simple dictionary
 *
 * ```typescript
 * const dict = new RecordView({
 *   foo: [1n, 2n, 3n],
 *   bar: {
 *     baz: "qux",
 *     quux: true,
 *   },
 * });
 * ```
 *
 * The above code is mostly equivalent to the following code:
 *
 * ```typescript
 * const dict = new BencodexDictionary([
 *   ["foo", [1n, 2n, 3n]],
 *   [
 *     "bar",
 *     new BencodexDictionary([
 *       ["baz", "qux"],
 *       ["quux", true],
 *     ]),
 *   ],
 * ])
 * ```
 */
export class RecordView implements Dictionary {
  #record: RecordValue;
  #size: number | undefined;
  #textEncoder: TextEncoder | undefined;
  #textDecoder: TextDecoder | undefined;

  /**
   * How the keys are encoded.  If it is `"text"`, the keys are encoded as
   * Bencodex texts.  If it is `"utf8"`, the keys are encoded as Bencodex binary
   * values with UTF-8 encoding.
   */
  readonly keyEncoding: "text" | "utf8";

  /**
   * Creates a new {@link RecordView} instance.
   * @param record The record object to view.
   * @param keyEncoding How the keys are encoded.  If it is `"text"`, the keys
   *                    are encoded as Bencodex texts.  If it is `"utf8"`, the
   *                    keys are encoded as Bencodex binary values with UTF-8
   *                    encoding.
   * @throws {TypeError} When the given record is not an object or is null.
   */
  constructor(record: RecordValue, keyEncoding: "text" | "utf8") {
    if (typeof record !== "object") {
      throw new TypeError(
        `Expected an object, but got a ${typeof record}`,
      );
    } else if (record == null) {
      throw new TypeError("Expected an object, but got null");
    }
    this.#record = record;
    this.#textEncoder = keyEncoding == "text" ? undefined : new TextEncoder();
    this.#textDecoder = keyEncoding == "text" ? undefined : new TextDecoder();
    this.keyEncoding = keyEncoding;
  }

  /** {@inheritDoc Dictionary.size} */
  get size(): number {
    if (this.#size === undefined) {
      this.#size = Object.keys(this.#record).length;
    }
    return this.#size;
  }

  #getField(key: Key): string | undefined {
    if (this.#textDecoder == null) {
      return typeof key === "string" ? key : undefined;
    }

    return typeof key === "string" ? undefined : this.#textDecoder.decode(key);
  }

  /** {@inheritDoc Dictionary.get} */
  get(key: Key): Value | undefined {
    const field = this.#getField(key);
    if (field == null) return undefined;
    const value = this.#record[field];
    if (isRecordValue(value)) return new RecordView(value, this.keyEncoding);
    return value;
  }

  /** {@inheritDoc Dictionary.has} */
  has(key: Key): boolean {
    const field = this.#getField(key);
    return field != null && field in this.#record;
  }

  /** {@inheritDoc Dictionary.keys} */
  *keys(): Iterable<Key> {
    const keys = Object.keys(this.#record);
    const encoder = this.#textEncoder;
    if (encoder == null) yield* keys;
    else {
      for (const key of keys) yield encoder.encode(key);
    }
  }

  /** {@inheritDoc Dictionary.values} */
  *values(): Iterable<Value> {
    for (const value of Object.values(this.#record)) {
      yield isRecordValue(value)
        ? new RecordView(value, this.keyEncoding)
        : value;
    }
  }

  /** {@inheritDoc Dictionary.entries} */
  entries(): Iterable<[Key, Value]> {
    return this;
  }

  /** {@inheritDoc Dictionary.forEach} */
  forEach(
    callback: (value: Value, key: Key, dictionary: Dictionary) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this) {
      callback.call(thisArg, value, key, this);
    }
  }

  /**
   * Gets an iterator which iterates over the key-value pairs in this
   * dictionary.  This method is equivalent to `Dictionary.entries()`.
   * @returns An iterator which iterates over the key-value pairs in this
   *          dictionary.
   * @see {@link RecordView.entries}
   */
  *[Symbol.iterator](): Iterator<[Key, Value]> {
    const entries = Object.entries(this.#record);
    const encoder = this.#textEncoder;
    if (encoder == null) {
      for (const [key, value] of entries) {
        yield [
          key,
          isRecordValue(value)
            ? new RecordView(value, this.keyEncoding)
            : value,
        ];
      }
    } else {
      for (const [key, value] of entries) {
        yield [
          encoder.encode(key),
          isRecordValue(value)
            ? new RecordView(value, this.keyEncoding)
            : value,
        ];
      }
    }
  }

  [Symbol.for("Deno.customInspect")](
    inspect: (_: unknown, options: unknown) => string,
    options: {
      compact: boolean;
      depth: number;
      sorted: boolean;
      trailingComma: boolean;
    },
  ): string {
    return inspectDictionary(this, "BencodexDictionary", inspect, options);
  }

  [Symbol.for("nodejs.util.inspect.custom")](
    _: number,
    options: {
      compact: number | boolean;
      depth: number;
      sorted: boolean;
    },
    inspect: (_: unknown, options: unknown) => string,
  ): string {
    return inspectDictionary(this, "BencodexDictionary", inspect, {
      ...options,
      compact: options.compact !== false,
      trailingComma: false,
    });
  }
}
