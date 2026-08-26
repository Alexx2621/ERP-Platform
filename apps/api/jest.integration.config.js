module.exports = {
  displayName: "postgres integration",
  rootDir: ".",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/jest-env-setup.js"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  testRegex: ".*\\.integration-spec\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"],
  testTimeout: 120_000,
  maxWorkers: 1,
};
