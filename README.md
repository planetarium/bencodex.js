<!-- deno-fmt-ignore-file -->

Bencodex.js
===========

[![deno.land/x/bencodex status][]][deno.land/x/bencodex]
[![npm status][]][@planetarium/bencodex]
[![CI status][]][GitHub Actions]
[![Coverage status][]][Coveralls]

This library is an alternative take on implementing [Bencodex] in JavaScript.

It focused to address the following problems from the existing JavaScript
implementation(s):

 -  *No Node.js-specific APIs*:  It does not depend on Node.js-specific APIs
    such as [`Buffer`].  Usable with web browsers, Deno, and Node.js.

 -  *Static-time and runtime type safety*:  It is fully written in TypeScript,
    and promise you, we use [`any`] nowhere, and it never trusts any data from
    external sources thoughtlessly.  Instead, it tries to parse data and
    validate them whenever it reads data from external sources.  It's not only
    written in TypeScript, it also has runtime checks here and there so that
    you could use it in vanilla JavaScript without fear.

 -  *Well-tested*:  Passing only the Bencodex spec test suite is not enough to
    guarantee the whole functionality of a library, as every library has their
    own part to interpret data in JavaScript (how data should look like in
    JavaScript values, where data are read from and written into, whether data
    are streamed or given in a single big chunk, etc).  It has its own unit
    tests besides spec test suite, and we've done the best to reach
    [near-100% test coverage][Coveralls].

 -  *Comprehensive docs*:  Every non-trivial library needs the three types of
    docs: tutorials for getting stated, in-depth manuals for common scenarios,
    and complete API references with concise examples.  It has all of them!

 -  *Reducing unnecessary memcpy*:  Instead of creating chunks of
    [`Uint8Array`]s and then allocating a large buffer to concatenate the whole
    data once again, it allocates only the necessary buffer only once.
    It is not just memory-efficient, also time-efficient as memcpy quite
    takes time.

 -  *Proper binary keys*:  It does not simply depend on [`Map`], which compares
    its [`Uint8Array`] keys by reference equality.  Instead, it implements its
    own proper dictionary which compares [`Uint8Array`] by content equality.

Distributed under LGPL 2.1 or later.

[deno.land/x/bencodex status]: https://img.shields.io/github/v/tag/planetarium/bencodex.js?label=deno.land%2Fx%2Fbencodex
[deno.land/x/bencodex]: https://deno.land/x/bencodex
[npm status]: https://img.shields.io/npm/v/@planetarium/bencodex?label=npm%20i%20%40planetarium%2Fbencodex
[@planetarium/bencodex]: https://www.npmjs.com/package/@planetarium/bencodex
[CI status]: https://github.com/planetarium/bencodex.js/actions/workflows/main.yaml/badge.svg?branch=main
[GitHub Actions]: https://github.com/planetarium/bencodex.js/actions/workflows/main.yaml
[Coverage status]: https://coveralls.io/repos/github/planetarium/bencodex.js/badge.svg
[Coveralls]: https://coveralls.io/github/planetarium/bencodex.js
[Bencodex]: https://bencodex.org/
[`Buffer`]: https://nodejs.org/api/buffer.html
[`any`]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any
[`Uint8Array`]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
[`Map`]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map


Getting started
---------------

See also the [complete API references] as well.

[complete API references]: https://deno.land/x/bencodex/mod.ts


### Deno

It's available on [deno.land/x/bencodex]:

~~~~ typescript
import { decode, encode } from "https://deno.land/x/bencodex/mod.ts";

const value = new Map([
  ["foo", true],
  ["bar", null],
  ["baz", new Uint8Array([0x73, 0x70, 0x61, 0x6d])],
  [
    new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]),
    [
      123456n,
      "Unicode string",
      false,
    ],
  ],
]);
const encoded = encode(value);
const decoded = decode(encoded);
~~~~


### Node.js

Add [@planetarium/bencodex] to your dependencies using your favorite package
manager:

~~~~ console
npm install @planetarium/bencodex
~~~~

The API usage is equivalent to the example above for Deno, except that you
need to import things from `"@planetarium/bencodex"` instead of the
*deno.land/x/* URL:

~~~~ typescript
import { decode, encode } from "@planetarium/bencodex";
~~~~


Types
-----

| Bencodex   | TypeScript ([`Value`])        |
|------------|-------------------------------|
| Null       | `null`                        |
| Boolean    | `boolean`                     |
| Integer    | `bigint` (not `number`)       |
| Binary     | [`Uint8Array`]                |
| Text       | `string`                      |
| List       | `Value[]`                     |
| Dictionary | [`Dictionary`]                |

[`Value`]: https://deno.land/x/bencodex/mod.ts?s=Value
[`Dictionary`]: https://deno.land/x/bencodex/mod.ts?s=Dictionary


Benchmarks
----------

~~~~ console
$ deno bench
cpu: 12th Gen Intel(R) Core(TM) i5-1235U
runtime: deno 1.30.3 (x86_64-unknown-linux-gnu)

file:///home/dahlia/src/planetarium/bencodex.js/bench/comparison.bench.ts
benchmark                        time (avg)             (min … max)       p75       p99      p995
------------------------------------------------------------------- -----------------------------
encoding (bencodex.js)        28.96 µs/iter   (17.24 µs … 10.43 ms)  22.25 µs  117.5 µs 221.98 µs
encoding (disjukr/bencodex)   66.01 µs/iter    (39.36 µs … 4.38 ms)  55.58 µs  215.2 µs 313.14 µs

summary
  encoding (bencodex.js)
   2.28x faster than encoding (disjukr/bencodex)

decoding (bencodex.js)         7.73 µs/iter    (6.35 µs … 16.97 ms)   6.92 µs  17.39 µs  30.93 µs
decoding (disjukr/bencodex)   45.76 µs/iter     (31.2 µs … 5.08 ms)  46.35 µs 135.29 µs 185.85 µs

summary
  decoding (bencodex.js)
   5.92x faster than decoding (disjukr/bencodex)
~~~~

You can run the benchmarks by `deno bench`.
