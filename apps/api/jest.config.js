/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/jest-env-setup.js"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: ["<rootDir>/test/integration/"],
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "coverage",
};
