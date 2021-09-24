import express from 'express'
import { Router } from 'express'
import { PluginResourceUrl } from '../../entities/entities.global'
import { PluginUrlScheme } from '../url_schemes/adapters.url_schemes.plugin'

export function WebUIPluginRoutes(webUIPluginModules: string[], moduleSearchPaths?: string[]): Router {

  const webUIPluginModulesSorted = [ ...webUIPluginModules ].sort().reverse()
  const webUiResolver = new PluginUrlScheme(webUIPluginModules, moduleSearchPaths)
  const routes = Router()
  for (const moduleName of webUIPluginModulesSorted) {
    const moduleMainFileUrl = new PluginResourceUrl(moduleName)
    const moduleMainFilePath = webUiResolver.localPathOfUrl(moduleMainFileUrl)
    const moduleBaseDirUrl = new PluginResourceUrl(moduleName + '/')
    const moduleBasePath = webUiResolver.localPathOfUrl(moduleBaseDirUrl)
    if (typeof moduleMainFilePath !== 'string') {
      console.error('error resolving main file of web ui plugin module', moduleBasePath)
    }
    else if (typeof moduleBasePath !== 'string') {
      console.error('error resolving base path of web ui plugin module', moduleBasePath)
    }
    else {
      routes.use(`/${moduleName}`, express.static(moduleBasePath, { redirect: false }))
      routes.route(`/${moduleName}`)
        .head((req, res) => {
          res.sendFile(moduleMainFilePath)
        })
        .get((req, res) => {
          res.sendFile(moduleMainFilePath)
        })
    }
  }

  routes.route('/')
    .get(async (req, res) => {
      res.json(webUIPluginModulesSorted)
    })

  return routes
}