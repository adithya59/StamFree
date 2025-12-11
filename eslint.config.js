// https://docs.expo.dev/guides/using-eslint/
import expoConfig from 'eslint-config-expo/flat.js';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  expoConfig,
  {
    // Ignore generated and vendor artifacts that should not be linted
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      '.expo/**',
      '.specify/**',
      'android/app/build/**',
    ],
  },
]);
