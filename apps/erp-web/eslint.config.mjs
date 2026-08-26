import globals from "globals";
import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    files: ["src/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
