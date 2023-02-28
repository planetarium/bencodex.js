import { build, emptyDir } from "dnt";

await emptyDir("./npm");

const version = Deno.args[0];

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  package: {
    // package.json properties
    name: "@planetarium/bencodex",
    version,
    description:
      "An alternative take on implementing Bencodex in TypeScript/JavaScript",
    keywords: ["bencode", "bencodex"],
    license: "LGPL-2.1-or-later",
    author: {
      name: "Hong Minhee",
      email: "hong.minhee@planetariumhq.com",
      url: "https://hongminhee.org/",
    },
    homepage: "https://github.com/planetarium/bencodex.js",
    repository: {
      type: "git",
      url: "git+https://github.com/planetarium/bencodex.js.git",
    },
    bugs: {
      url: "https://github.com/planetarium/bencodex.js/issues",
    },
  },
  shims: {
    deno: "dev",
  },
  typeCheck: false,
  test: true,
  declaration: true,
  esModule: true,
  rootTestDir: "./test",
  importMap: "./deno.json",
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
