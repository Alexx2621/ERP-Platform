import globals from "globals";
import rootConfig from "../../eslint.config.mjs";

export default [
  { ignores: ["next-env.d.ts", "dist/**"] },
  ...rootConfig,
  {
    files: ["src/**/*.{ts,tsx}", "next.config.ts", "postcss.config.mjs", "vitest.config.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
