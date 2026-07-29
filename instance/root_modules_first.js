const Module = require('module');
const path = require('path');
const fs = require('fs');

const modulesRootDir = path.resolve(__dirname, 'node_modules')
console.log('load modules starting from', modulesRootDir)

/**
 * Override the module search path when running the development server so plugins load @ngageoint/mage.service
 * from this directory instead of the plugin's own node_modules directory, which can cause unexpected behavior
 * and errors.
 */

const originalFindPath = Module._findPath;

Module._findPath = function (request, paths, isMain) {
  // Only intercept bare specifiers (npm packages)
  if (!request.startsWith('.') && !request.startsWith('/') && !path.isAbsolute(request)) {

    // Check if the requested package exists in the top-level directory
    const parts = request.split('/');
    const pkgName = request.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    const topLevelPkgPath = path.join(modulesRootDir, pkgName);

    if (fs.existsSync(topLevelPkgPath)) {
      // Prioritize the top-level path by prepending it to the lookup array
      const prioritizedPaths = [modulesRootDir, ...paths];
      return originalFindPath.call(this, request, prioritizedPaths, isMain);
    }
  }

  // Default behavior
  return originalFindPath.call(this, request, paths, isMain);
};