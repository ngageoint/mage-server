import { Rule, chain, externalSchematic, SchematicsException, DirEntry, Tree,  } from '@angular-devkit/schematics'
import { Schema as BaseLibraryOptions } from '@schematics/angular/library/schema'
import { getWorkspace, updateWorkspace,  } from '@schematics/angular/utility/workspace'
import { insertImport, insertAfterLastOccurrence, findNodes } from '@schematics/angular/utility/ast-utils'
import { applyToUpdateRecorder, NoopChange } from '@schematics/angular/utility/change'
import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript'
import { JsonObject } from '@angular-devkit/core'
import { parse as semverParse } from 'semver'

function addPluginHookToEntryPoint(options: PluginLibraryOptions): Rule {
  const entryFile = options.entryFile
  if (!entryFile) {
    throw new SchematicsException('missing entryFile')
  }
  return async (tree, _context) => {
    const workspace = await getWorkspace(tree)
    const project = workspace.projects.get(options.name)
    if (!project) {
      throw new SchematicsException(`project not found in workspace: ${project}`)
    }
    const libDirPath = `${project.sourceRoot}/lib`
    const libDir = tree.getDir(libDirPath)
    const module = findLibraryNgModule(tree, libDir)
    const moduleClassName = module.classDecl.name?.text
    const component = findLibraryComponent(tree, libDir)
    const componentClassName = component.classDecl.name?.text
    const entryFilePath = `${project.sourceRoot}/${entryFile}.ts`
    const entryFileText = tree.readText(entryFilePath)
    const entrySource = ts.createSourceFile(entryFilePath, entryFileText, ts.ScriptTarget.Latest, true)
    const importCoreChange = insertImport(entrySource, entryFilePath, 'PluginHooks', '@ngageoint/mage.web-core-lib/plugin')
    const importModuleChange = moduleClassName ? insertImport(entrySource, entryFilePath, moduleClassName, `./lib/${module.sourceFile.fileName.slice(0, -3)}`) : new NoopChange()
    const importComponentChange = componentClassName ? insertImport(entrySource, entryFilePath, componentClassName, `./lib/${component.sourceFile.fileName.slice(0, -3)}`) : new NoopChange()
    const packageJson = tree.readJson(`${project.root}/package.json`) as JsonObject
    const packageName = packageJson.name as string
    const pluginExport =
`
export const MAGE_WEB_HOOKS: PluginHooks = {
  module: ${moduleClassName},
  adminTab: {
    title: '${packageName}',
    tabContentComponent: ${componentClassName},
  }
}
`
    type ExportNodes = ts.ExportAssignment | ts.ExportDeclaration | ts.ExportSpecifier | ts.NamedExports
    const exportNodes = findNodes<ExportNodes>(entrySource, ((x: ts.Node) => {
      return [
        ts.SyntaxKind.ExportAssignment,
        ts.SyntaxKind.ExportDeclaration,
        ts.SyntaxKind.ExportSpecifier,
        ts.SyntaxKind.NamedExports,
      ].includes(x.kind)
    }) as ((node: ts.Node) => node is ExportNodes))
    .sort((a, b) => a.getStart() - b.getStart())
    const pluginExportChange = insertAfterLastOccurrence(exportNodes, pluginExport, entryFilePath, entrySource.end)
    const edit = tree.beginUpdate(entryFilePath)
    applyToUpdateRecorder(edit, [ importCoreChange, importModuleChange, importComponentChange, pluginExportChange ].filter(x => !!x))
    tree.commitUpdate(edit)
  }
}

function findLibraryNgModule(tree: Tree, baseDir: DirEntry): { sourceFile: ts.SourceFile, classDecl: ts.ClassDeclaration } {
  const fileName = baseDir.subfiles.find(x => /\.module\.ts$/.test(x)) || ''
  const filePath = `${baseDir.path}/${fileName}`
  const fileText = tree.readText(filePath)
  const source = ts.createSourceFile(fileName, fileText, ts.ScriptTarget.Latest, true)
  const classDecl = findNodes(source, ts.SyntaxKind.ClassDeclaration)[0] as ts.ClassDeclaration
  return { sourceFile: source, classDecl: classDecl }
}

function findLibraryComponent(tree: Tree, baseDir: DirEntry): { sourceFile: ts.SourceFile, classDecl: ts.ClassDeclaration } {
  const fileName = baseDir.subfiles.find(x => /\.component\.ts$/.test(x)) || ''
  const filePath = `${baseDir.path}/${fileName}`
  const fileText = tree.readText(filePath)
  const source = ts.createSourceFile(fileName, fileText, ts.ScriptTarget.Latest, true)
  const classDecl = findNodes(source, ts.SyntaxKind.ClassDeclaration)[0] as ts.ClassDeclaration
  return { sourceFile: source, classDecl: classDecl }
}

function useCustomBuilder(options: PluginLibraryOptions): Rule {
  return updateWorkspace(workspace => {
    const projName = options.name
    const project = workspace.projects.get(projName)
    if (!project) {
      throw new SchematicsException(`project not found in workspace: ${projName}`)
    }
    const target = project.targets.get('build')
    project.targets.set('build', {
      ...target,
      builder: '@ngageoint/mage.web-core-lib:amd'
    })
    workspace.projects.set(projName, project)
  })
}

function addCorePeerDependency(options: PluginLibraryOptions): Rule {
  return async (tree, _context) => {
    const corePkg = require('@ngageoint/mage.web-core-lib/package.json')
    const coreVersion = semverParse(corePkg.version)
    const coreVersionConstraint = !!coreVersion ? `^${coreVersion.major}.${coreVersion.minor}.${coreVersion.patch}` : null
    const workspace = await getWorkspace(tree)
    const project = workspace.projects.get(options.name)
    if (!project) {
      throw new SchematicsException(`project not found in workspace: ${options.name}`)
    }
    const packageJsonPath = `${project.root}/package.json`
    const packageJson = tree.readJson(packageJsonPath) as JsonObject
    const packageJsonMod = {
      ...packageJson,
      dependencies: {},
      peerDependencies: {
        '@ngageoint/mage.web-app': coreVersionConstraint
      }
    }
    tree.overwrite(packageJsonPath, JSON.stringify(packageJsonMod, null, 2))
  }
}

export function mageWebPluginLibrary(options: PluginLibraryOptions): Rule {
  if (!options.name) {
    throw new SchematicsException('missing name of the library to generate')
  }
  return chain([
    (_tree, context) => {
      context.logger.info(`creating MAGE web plugin library ${options.name}`)
    },
    externalSchematic('@schematics/angular', 'library', options),
    useCustomBuilder(options),
    addPluginHookToEntryPoint(options),
    addCorePeerDependency(options),
  ])
}

export interface PluginLibraryOptions extends BaseLibraryOptions {

}
