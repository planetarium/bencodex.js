<!-- deno-fmt-ignore-file -->

Changelog
=========

Version 0.3.0
-------------

To be released.

 -  Added `SizeEstimationOptions` interface.


Version 0.2.2
-------------

Released on March 6, 2023.  This is a hotfix of 0.2.1.

 -  Fixed a bug that [`areValuesEqual()`] and [`areDictionariesEqual()`] were
    not re-exported from *mod.ts* and npm [@planetarium/bencodex] package.

[`areValuesEqual()`]:
https://deno.land/x/bencodex@0.2.2/mod.ts?s=areValuesEqual
[`areDictionariesEqual()`]:
https://deno.land/x/bencodex@0.2.2/mod.ts?s=areDictionariesEqual
[@planetarium/bencodex]: https://www.npmjs.com/package/@planetarium/bencodex


Version 0.2.1
-------------

Released on March 6, 2023.  This release was mistaken.  Don't use this version,
and use 0.2.2 instead.

 -  <del>Fixed a bug that [`areValuesEqual()`] and [`areDictionariesEqual()`]
    were not re-exported from *mod.ts* and npm [@planetarium/bencodex]
    package.</del>


Version 0.2.0
-------------

Released on March 3, 2023.

 -  Added [`areValuesEqual()`][] function.
 -  Added [`areDictionariesEqual()`][] function.


Version 0.1.1
-------------

Released on March 3, 2023.

 -  [`BencodexDictionary`] and [`RecordView`] now shows easier inspection
    representions on the eyes both on Deno ([`Deno.inspect()`]) and
    Node.js ([`util.inspect()`]).


[`BencodexDictionary`]: https://deno.land/x/bencodex@0.1.1/mod.ts?s=BencodexDictionary
[`RecordView`]: https://deno.land/x/bencodex@0.1.1/mod.ts?s=RecordView
[`Deno.inspect()`]: https://deno.land/api?s=Deno.inspect
[`util.inspect()`]: https://nodejs.org/api/util.html#utilinspectobject-options


Version 0.1.0
-------------

Initial release. Released on March 2, 2023.
