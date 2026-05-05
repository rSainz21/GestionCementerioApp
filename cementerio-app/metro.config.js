const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const stubReactNativeMaps = path.resolve(__dirname, 'web-stubs', 'react-native-maps.js');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: stubReactNativeMaps,
    };
  }

  return originalResolveRequest ? originalResolveRequest(context, moduleName, platform) : resolve(context, moduleName, platform);
};

module.exports = config;

