import * as disjukrBencodex from "npm:bencodex";
import * as bencodexJs from "../src/encoder.ts";

const data = new Map<
  string | Uint8Array,
  | Map<string | Uint8Array, string>
  | string
  | Uint8Array
  | bigint
  | null
  | boolean
>([
  ["foo", 123n],
  ["bar", "baz"],
  ["qux", null],
  ["quux", true],
  ["quuz", false],
  ["corge", new Uint8Array(1024)],
  [
    "grault",
    new Map<string | Uint8Array, string>([
      ["foo", "bar"],
      ["baz", "qux"],
      [new Uint8Array(128), "quux"],
    ]),
  ],
  [new Uint8Array(128), "garply"],
]);

Deno.bench(
  "encoding (bencodex.js)",
  { group: "encoding", baseline: true },
  () => void (bencodexJs.encode(data)),
);

Deno.bench(
  "encoding (disjukr/bencodex)",
  { group: "encoding" },
  () => disjukrBencodex.encode(data),
);
