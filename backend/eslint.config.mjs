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
      // SQL is text plus $n parameters, never built from values (quality.md section 2).
      "no-restricted-syntax": [
        "error",
        {
          // ${COLUMNS} style constants (fixed column lists) are allowed; any other expression is not.
          selector:
            "CallExpression[callee.property.name='query'] > TemplateLiteral.arguments:first-child > :not(TemplateElement):not(Identifier[name=/^[A-Z][A-Z0-9_]*$/])",
          message: "Do not build SQL with ${}. Pass values as $1, $2 parameters.",
        },
        {
          selector: "CallExpression[callee.property.name='query'] > BinaryExpression.arguments:first-child",
          message: "Do not build SQL by concatenation. Pass values as $1, $2 parameters.",
        },
      ],
    },
  },
  {
    files: ["scripts/**", "src/cli/**", "test/**"],
    rules: { "no-console": "off" },
  },
  {
    files: ["test/**"],
    // Test helpers build DDL and table names from constants they own.
    rules: { "max-lines-per-function": "off", "max-lines": "off", "no-restricted-syntax": "off" },
  },
];
