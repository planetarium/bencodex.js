import { Buffer } from "std/node/buffer.ts";
import * as disjukrBencodex from "npm:bencodex";
import * as bencodexJs from "../mod.ts";

const tree = new Map<
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

const encoding = bencodexJs.encode(tree);
const encodingBuffer = Buffer.from(encoding);

Deno.bench(
  "encoding (bencodex.js)",
  { group: "encoding", baseline: true },
  () => void (bencodexJs.encode(tree)),
);

Deno.bench(
  "encoding (disjukr/bencodex)",
  { group: "encoding" },
  () => disjukrBencodex.encode(tree),
);

Deno.bench(
  "decoding (bencodex.js)",
  { group: "decoding", baseline: true },
  () => void (bencodexJs.decode(encoding)),
);

Deno.bench(
  "decoding (disjukr/bencodex)",
  { group: "decoding" },
  () => disjukrBencodex.decode(encodingBuffer),
);
