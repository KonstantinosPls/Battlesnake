import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
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
    },
  },
  prettier,
  {
    ignores: ["node_modules/**", "package-lock.json"],
  },
];
