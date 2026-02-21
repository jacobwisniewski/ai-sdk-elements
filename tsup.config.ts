import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      server: "src/server.ts",
      react: "src/react.ts",
      "react-markdown": "src/react-markdown.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react", "ai", "zod"],
  },
]);
