import { defineBuildConfig } from "unbuild";
import { copyFileSync } from "node:fs";
import { resolve } from "pathe";

export default defineBuildConfig({
  entries: ["./src/index", "./src/cli"],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
});
