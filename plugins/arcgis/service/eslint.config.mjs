import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import jsdoc from 'eslint-plugin-jsdoc';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-description": "warn",
      "semi": ["error", "always"]
    },
    "overrides": [
      {
        // enable the rule specifically for TypeScript files
        "files": ["*.ts", "*.tsx"],
        "rules": {
          "@typescript-eslint/no-explicit-any": "off"
        }
      }
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs['flat/recommended'],
];