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
  hooks: {
    "build:done": (ctx) => {
      // Copy modelrules.toml to dist directory
      copyFileSync(
        resolve(ctx.options.rootDir, "modelrules.toml"),
        resolve(ctx.options.outDir, "modelrules.toml")
      );
    },
  },
});
