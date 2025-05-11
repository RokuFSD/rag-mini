// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stTs from "@stylistic/eslint-plugin-ts"

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    plugins: {
      ["@stylistic/ts"]: stTs,
    },
    rules: {
      '@stylistic/ts/indent': ['error', 2],
    }
  }
);
