import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import jest from "eslint-plugin-jest";
import prettier from "eslint-config-prettier";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      sonarjs,
      unicorn,
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      ...sonarjs.configs.recommended.rules,
      ...unicorn.configs.recommended.rules,
      ...eslintComments.configs.recommended.rules,
      "unicorn/prevent-abbreviations": [
        "error",
        {
          allowList: {
            req: true,
            res: true,
            i: true,
          },
        },
      ],
      "sonarjs/pseudo-random": "off",
      "sonarjs/cognitive-complexity": ["error", 70],
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            kebabCase: true,
            camelCase: true,
          },
        },
      ],
    },
  },
  {
    files: ["**/*.test.js", "**/__tests__/**/*.js"],
    plugins: {
      jest,
    },
    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
      },
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
  prettier,
  {
    ignores: ["node_modules/**", "package-lock.json", "coverage/**", "docs/**"],
  },
];
