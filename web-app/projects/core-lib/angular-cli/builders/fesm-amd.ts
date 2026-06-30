import * as path from 'path'
import { executeNgPackagrBuilder } from '@angular-devkit/build-angular'
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect'
import { rollup } from 'rollup'
import { discoverPackages as ngPackagrDiscoverPackages } from 'ng-packagr/lib/ng-package/discover-packages'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { NgPackage } from 'ng-packagr/lib/ng-package/package'
import { writeFile } from 'fs/promises'

interface BuildInfo {
  options: any
  context: BuilderContext
  packages: NgPackage
  ngPackagePath: string
  destDir: string
  amdName: string
  amdPath: string
  fesm2022Path: string
}

type MinimalSubscribable<T> = {
  subscribe: (
    next?: (value: T) => void,
    error?: (err: unknown) => void,
    complete?: () => void
  ) => { unsubscribe(): void } | void
}

function firstValueFromSubscribable<T>(source: MinimalSubscribable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false
    let subscription: { unsubscribe(): void } | void

    subscription = source.subscribe(
      (value: T) => {
        if (done) return
        done = true
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe()
        }
        resolve(value)
      },
      (err: unknown) => {
        if (done) return
        done = true
        reject(err)
      }
    )
  })
}

async function ngPackagrThenAmd(options: any, context: BuilderContext): Promise<BuilderOutput> {
  let ngPackagrResult: BuilderOutput

  try {
    ngPackagrResult = await firstValueFromSubscribable(
      executeNgPackagrBuilder(options, context) as unknown as MinimalSubscribable<BuilderOutput>
    )
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    context.logger.error(message)
    return {
      success: false,
      error: message
    }
  }

  if (ngPackagrResult.error) {
    context.logger.error(ngPackagrResult.error)
  }

  if (!ngPackagrResult.success) {
    return ngPackagrResult
  }

  const buildInfo = await resolveBuildInfo(options, context)

  const rollupResult = await rollupFesmToAmd(buildInfo)
  if (!rollupResult.success) {
    return rollupResult
  }

  return await writeDistPackageJson(buildInfo)
}

async function resolveBuildInfo(options: any, context: BuilderContext): Promise<BuildInfo> {
  const root = context.workspaceRoot
  const ngPackagePath = path.resolve(root, options.project)
  const packages = await ngPackagrDiscoverPackages({ project: ngPackagePath })
  const destDir = packages.dest
  const fesm2022Path = packages.primary.destinationFiles.fesm2022
  const amdName = `${packages.primary.flatModuleFile}.amd.js`
  const amdPath = path.resolve(destDir, amdName)

  return {
    options,
    context,
    packages,
    ngPackagePath,
    destDir,
    fesm2022Path,
    amdName,
    amdPath
  }
}

async function rollupFesmToAmd(buildInfo: BuildInfo): Promise<BuilderOutput> {
  const { context, fesm2022Path, amdPath } = buildInfo

  context.logger.info(`rolling FESM2022 to AMD ${JSON.stringify({
    fesm2022Path,
    amdPath
  }, null, 2)}`)

  try {
    const roller = await rollup({
      input: fesm2022Path,
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
      ]
    })

    const rolled = await roller.write({
      format: 'amd',
      file: amdPath
    })

    for (const rollOut of rolled.output) {
      context.logger.info(`rolled ${rollOut.name} ${rollOut.type} ${rollOut.fileName}`)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    context.logger.error('error creating amd module from fesm: ' + message)
    console.error(err)
    return {
      success: false,
      error: message
    }
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
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    buildInfo.context.logger.error(`error writing dist package ${distPkgPath}: ${message}`)
    return {
      success: false,
      error: message
    }
  }

  return { success: true }
}

export default createBuilder(ngPackagrThenAmd)