const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

// Watch the whole monorepo so changes in sibling workspaces (cloud-sync)
// trigger reloads during dev.
config.watchFolders = [monorepoRoot]

// With nodeLinker=hoisted, deps live in the root `node_modules`; keep the
// app's own folder first so locally-declared versions win on resolution.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

module.exports = withNativeWind(config, { input: './global.css' })
