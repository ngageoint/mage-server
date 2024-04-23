import { Rule } from '@angular-devkit/schematics'

/**
 * Return an identity rule that leaves the workspace tree unchanged, as there
 * are no default artifacts to add on installation.  However, an ng-add
 * schematic is necessary to support the `"ng-add"` package.json entry which
 * tells `ng-add` to add the lib to `"devDependencies"`.
 */
export function ngAdd(): Rule {
  return tree => tree
}