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
