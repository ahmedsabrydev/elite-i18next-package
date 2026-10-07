const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// pnpm keeps transitive dependencies inside `.pnpm/<pkg>/node_modules`, so the
// hierarchical walk must stay enabled for Expo packages to find their siblings.
config.resolver.disableHierarchicalLookup = false

// Force a single React instance for the app. Without this, modules that resolve
// through the workspace package would pick up pnpm's nested React copy.
const SINGLETON = /^react(-dom)?(\/.*)?$/
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLETON.test(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.ts') },
      moduleName,
      platform,
    )
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
