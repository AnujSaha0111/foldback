import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

// Rules from docs/spec/quality.md section 2, including the frontend bans.
const BANNED_IMPORTS = [
  { name: "lodash", message: "Use the platform (quality.md: no lodash)." },
  { name: "moment", message: "Use Intl (quality.md: no moment on the client)." },
  { name: "date-fns", message: "Use Intl (quality.md: no date-fns on the client)." },
  { name: "axios", message: "Use fetch or RTK Query (quality.md: no axios)." },
  { name: "@mui/icons-material", message: "Import one icon by path: @mui/icons-material/Check." },
  { name: "@mui/material", importNames: ["Icon"], message: "Import icons by path." },
];

export default defineConfig([
  ...nextVitals,
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
      "no-restricted-imports": ["error", { paths: BANNED_IMPORTS }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "dangerouslySetInnerHTML is banned. Render model and user text as plain text.",
        },
      ],
    },
  },
  // The tool configs sit outside tsconfig, so they are linted without type information.
  { files: ["**/*.mjs"], ...tseslint.configs.disableTypeChecked },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.ts"],
    rules: { "max-lines-per-function": "off", "max-lines": "off" },
  },
  globalIgnores([".next/**", "node_modules/**", "coverage/**", "next-env.d.ts", "src/types/generated/**"]),
]);
