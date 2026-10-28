import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist", "node_modules", "coverage", "jest.config.cjs", "eslint.config.mjs"] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
      eqeqeq: "error",
      complexity: ["error", 12],
      "max-depth": ["error", 3],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["scripts/**", "test/**"],
    rules: { "no-console": "off", "max-lines-per-function": "off", "max-lines": "off" },
  },
];
