module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom/$1',
    '^@faang/i18n/catalogs/(.*)$': '<rootDir>/../../packages/i18n/catalogs/$1',
    '^@faang/i18n/native$': '<rootDir>/../../packages/i18n/src/native/index.ts',
    '^@faang/i18n/react$': '<rootDir>/../../packages/i18n/src/react/index.ts',
    '^@faang/i18n$': '<rootDir>/../../packages/i18n/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@faang/i18n))',
  ],
}
