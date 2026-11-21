const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  modulePaths: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = async () => {
  const nextConfig = await createJestConfig(customJestConfig)();
  return {
    ...nextConfig,
    moduleNameMapper: {
      ...nextConfig.moduleNameMapper,
      "^@/(.*)$": "<rootDir>/src/$1",
    },
  };
};
