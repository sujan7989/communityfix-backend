const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to transpile firebase and other ESM packages
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
