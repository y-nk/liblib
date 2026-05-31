const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Resolve `@y_nk/react-native-cloud-sync` to the local in-repo package so
// Metro can bundle it without a real npm install.
const aliases = {
  '@y_nk/react-native-cloud-sync': path.resolve(__dirname, 'packages/cloud-sync/src/index.ts'),
}

const originalResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (aliases[moduleName]) {
    return {
      filePath: aliases[moduleName],
      type: 'sourceFile',
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

// Watch the packages directory so Metro picks up changes during dev.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, 'packages')]

module.exports = withNativeWind(config, { input: './global.css' })
