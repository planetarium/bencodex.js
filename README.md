<!-- deno-fmt-ignore-file -->

Bencodex.js
===========

This library is an alternative take on implementing [Bencodex] in JavaScript.

It focused to address the following problems from the existing JavaScript
implementation(s):

 -  *No Node.js-only APIs*:  It does not depend on Node.js-only APIs such as
    `Buffer`.  Usable with web browsers, Deno, and Node.js.

 -  *Static-time and runtime type safety*:  It is fully written in TypeScript,
    and promise us, we use `any` nowhere, and it never trusts any data from
    external sources thoughtlessly.  Instead, it tries to parse data and
    validate them whenever it read data from external sources.  It's not only
    written in TypeScript, it also has runtime checks here and there so that
    you could use it in vanilla JavaScript without fear.

 -  *Well-tested*:  Passing only the Bencodex spec test suite is not enough to
    guarantee the whole functionality of a library, as every library has their
    own part to interpret data in JavaScript (how data should look like in
    JavaScript values, where data are read from and written into, whether data
    are streamed or given in a single big chunk, etc).  It has its own unit
    tests besides spec test suite, and we've done the best to reach near-100%
    test coverage.

 -  *Proper binary keys*:  It does not simply depend on
    `Map<Uint8Array | string, ...>`, which compares its `Uint8Array` keys by
    reference equality.  Instead, it implements its own proper dictionary which
    compares `Uint8Array` by content equality.

Distributed under LGPL 2.1 or later.

[Bencodex]: https://bencodex.org/
