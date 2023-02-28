/**
 * Checks if the given two Uint8Arrays are equal.
 * @param a An Uint8Array.
 * @param b Another Uint8Array.
 * @returns `true` iff the given two Uint8Arrays are equal.
 */
export function areUint8ArraysEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Compares two Uint8Arrays lexicographically.
 * @param a An Uint8Array.
 * @param b Another Uint8Array.
 * @returns A negative number if `a` is less than `b`, a positive number
 *          if `a` is greater than `b`, or zero if `a` and `b` are equal.
 */
export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;
  return 0;
}

/**
 * Represents the end state of {@link decodeAsciiNaturalNumber}.
 * @typeParam The type of the decoded value.
 */
export type NaturalNumberDecodingState<T extends number | bigint> =
  /** The case where decoding a natural number succeeds. */
  | {
    /** Whether it is successful.  It's always `true` in this case. */
    success: true;
    /** The number of read bytes.  It's always greater than 0 in this case. */
    read: number;
    /** The decoded number. */
    value: T;
  }
  /** The case where decoding a natural number fails. */
  | {
    /** Whether it is successful.  It's always `false` in this case. */
    success: false;
    /** The number of read bytes.  It's always zero in this case. */
    read: 0;
  };

export function decodeAsciiNaturalNumber(
  buffer: Uint8Array,
  type: "number",
): NaturalNumberDecodingState<number>;

export function decodeAsciiNaturalNumber(
  buffer: Uint8Array,
  type: "bigint",
): NaturalNumberDecodingState<bigint>;

/**
 * Decodes ASCII-encoded digits in the given buffer into a natural number.
 * It does not parse signed numbers.
 * @typeParam The type of the decoded value.
 * @param type The type to represent the decoded value.
 * @param buffer A buffer that starts with ASCII-encoded digits to decode.
 * @returns An object representing the end-state.  Its `success` field contains
 *          a Boolean value that shows if it succeeded. Its `read` field
 *          contains the number of read bytes.  If it was successful,
 *          it contains one more field named `value` which contains the parsed
 *          number.
 */
export function decodeAsciiNaturalNumber(
  buffer: Uint8Array,
  type: "number" | "bigint",
): NaturalNumberDecodingState<number | bigint> {
  let read = 0;
  if (type === "bigint") {
    let value = 0n;
    while (
      read < buffer.length && 0x30 <= buffer[read] && buffer[read] <= 0x39
    ) {
      value *= 10n;
      const digit = BigInt(buffer[read]) - 0x30n;
      value += digit;
      read++;
    }
    if (read < 1) return { success: false, read: 0 };
    return { success: true, read, value };
  } else {
    let value = 0;
    while (
      read < buffer.length && 0x30 <= buffer[read] && buffer[read] <= 0x39
    ) {
      value *= 10;
      const digit = buffer[read] - 0x30;
      value += digit;
      read++;
    }
    if (read < 1) return { success: false, read: 0 };
    return { success: true, read, value };
  }
}
