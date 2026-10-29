/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  collectCoverageFrom: ["src/**/*.ts", "!src/cli/**", "!src/server.ts"],
  // quality.md section 7: 85% of lines in the rules and the services. Applies when run with --coverage.
  coverageThreshold: { "./src/domain/": { lines: 85 }, "./src/services/": { lines: 85 } },
  maxWorkers: 1, // integration tests share one database
  testTimeout: 20000,
};
