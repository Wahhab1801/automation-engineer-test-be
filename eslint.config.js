import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
  {
    files: ["**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended", eslintConfigPrettier],
    rules: {
      ...eslintConfigPrettier.rules,
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-unreachable": "error",
      eqeqeq: "warn",
      "no-console": "warn",
      curly: "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "prefer-const": "warn",
      "no-var": "error",
      "no-dupe-keys": "warn",
      "no-const-assign": "error",
      "prefer-template": "warn",
      "no-useless-concat": "warn",
      "no-dupe-args": "error",
      "no-ex-assign": "error",
      "no-obj-calls": "error",
      "use-isnan": "error",
      "default-case": "warn",
      "default-param-last": "error",
      "no-floating-decimal": "error",
      "no-param-reassign": "error",
    },
  },
]);
