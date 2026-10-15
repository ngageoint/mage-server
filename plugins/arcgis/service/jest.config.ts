import type {Config} from 'jest';
import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

const config:Config = {
  testEnvironment: "node",
  transform: tsJestTransformCfg,
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    // This is needed to ensure that all imports of mongoose go to the same instance,
    // so the mocking logic is working on the same mongoose singletons that are
    // used by whatever code is using mongoose.
    '^mongoose$': '<rootDir>/node_modules/mongoose'
  }
};

export default config;
