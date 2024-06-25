import * as path from 'path'
import { executeNgPackagrBuilder } from '@angular-devkit/build-angular'
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect'
import { Observable, concat, defer, tap } from 'rxjs'
import { rollup } from 'rollup'
import { discoverPackages as ngPackagrDiscoverPackages } from 'ng-packagr/lib/ng-package/discover-packages'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { NgPackage } from 'ng-packagr/lib/ng-package/package'
import { writeFile } from 'fs/promises'

interface BuildInfo {
  options: any,
  context: BuilderContext,
  packages: NgPackage,
  ngPackagePath: string
  destDir: string
  amdName: string
  amdPath: string
  fesm2020Path: string
}

function ngPackagrThenAmd(options: any, context: BuilderContext): Observable<BuilderOutput> {
  return concat(
    executeNgPackagrBuilder(options, context).pipe(
      tap((x: BuilderOutput) => {
        if (x.error) {
          context.logger.error(x.error)
        }
      }) as any
    ) as any,
    /*
    TODO:
    cast to any works around type incompatibility between rxjs 6.6.7 from @angular-devkit/*
    packages and rxjs 7 other angular packages. hopefully that goes away with an angular upgrade.
    */
    defer(async () => {
      const buildInfo = await resolveBuildInfo(options, context)
      const rollupResult = await rollupFesmToAmd(buildInfo)
      if (rollupResult.success !== true) {
        return rollupResult
      }
      const packageJsonResult = await writeDistPackageJson(buildInfo)
      return packageJsonResult
    })
  ) as Observable<BuilderOutput>
}

async function resolveBuildInfo(options: any, context: BuilderContext): Promise<BuildInfo> {
  const root = context.workspaceRoot
  const ngPackagePath = path.resolve(root, options.project)
  const packages = await ngPackagrDiscoverPackages({ project: ngPackagePath })
  const destDir = packages.dest
  const fesm2020Path = packages.primary.destinationFiles.fesm2020
  const amdName = `${packages.primary.flatModuleFile}.amd.js`
  const amdPath = path.resolve(destDir, amdName)
  return {
    options,
    context,
    packages,
    ngPackagePath,
    destDir,
    fesm2020Path,
    amdName: amdName,
    amdPath: amdPath
  }
}

async function rollupFesmToAmd(buildInfo: BuildInfo): Promise<BuilderOutput> {
  const { context, fesm2020Path, amdPath } = buildInfo
  context.logger.info(`rolling FESM2020 to AMD ${JSON.stringify({
    fesm2020Path,
    amdPath
  }, null, 2)}`)
  try {
    const roller = await rollup({
      input: fesm2020Path,
      plugins: [
        nodeResolve({
          resolveOnly: moduleId => {
            const external = false
              || moduleId.startsWith('@angular/')
              || moduleId.startsWith('@ng-select/')
              || /^rxjs(\/.+)?/.test(moduleId)
            return !external
          },
          preferBuiltins: false
        }),
        commonjs()
      ],
    })
    const rolled = await roller.write({
      format: 'amd',
      file: amdPath
    })
    for (const rollOut of rolled.output) {
      context.logger.info(`rolled ${rollOut.name} ${rollOut.type} ${rollOut.fileName}`)
    }
    return {
      success: true
    } as BuilderOutput
  }
  catch (err) {
    context.logger.error('error creating amd module from fesm: ' + err)
    console.error(err)
    return {
      success: false,
      error: err
    } as BuilderOutput
  }
}

async function writeDistPackageJson(buildInfo: BuildInfo): Promise<BuilderOutput> {
  const distPkg = {
    ...buildInfo.packages.primary.packageJson,
    main: buildInfo.amdName
  }
  const distPkgPath = path.resolve(buildInfo.packages.primary.destinationPath, 'package.json')
  const distPkgContent = JSON.stringify(distPkg, null, 2)
  try {
    buildInfo.context.logger.info(`writing dist package to ${distPkgPath}`)
    await writeFile(distPkgPath, distPkgContent)
  }
  catch (err) {
    buildInfo.context.logger.error(`error writing dist package ${distPkgPath}: ${err}`)
  }
  return { success: true }
}

export default createBuilder(ngPackagrThenAmd)