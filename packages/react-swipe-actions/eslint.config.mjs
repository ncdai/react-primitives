import eslint from "@eslint/js"
import { defineConfig } from "eslint/config"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import turbo from "eslint-plugin-turbo"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
    },
  },
  {
    plugins: {
      turbo,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "error",
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    settings: { react: { version: "detect" } },
    ...reactPlugin.configs.flat.recommended,
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    ignores: ["dist/**", ".verify/**"],
  },
  eslintConfigPrettier,
])
