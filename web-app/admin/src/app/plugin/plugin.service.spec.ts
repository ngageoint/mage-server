import { HttpClient } from '@angular/common/http'
import { Compiler, Injector } from '@angular/core'
import { of } from 'rxjs'
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers'
import { PluginsById, PluginService } from './plugin.service'
import { SystemJS } from './systemjs.service'

describe('PluginService', () => {

  let mockClient: {
    get: jasmine.Spy<HttpClient['get']>
  }
  let compiler: {
    compileModuleAsync: jasmine.Spy<Compiler['compileModuleAsync']>
  }
  let injector: {
    get: jasmine.Spy<Injector['get']>
  }
  let system: {
    register: jasmine.Spy<SystemJS.Context['register']>,
    import: jasmine.Spy<SystemJS.Context['import']>
  }
  const token = String(Date.now())
  const localStorageService: LocalStorageService = {
    getToken() { return token }
  }
  let service: PluginService

  beforeEach(() => {

    system = {
      register: jasmine.createSpy('SystemJS.Context.register'),
      import: jasmine.createSpy('SystemJS.Context.import')
    }
    mockClient = {
      get: jasmine.createSpy('HttpClient.get')
    }
    service = new PluginService(
      mockClient as unknown as HttpClient,
      compiler as unknown as Compiler,
      injector as unknown as Injector,
      system as unknown as SystemJS.Registry,
      localStorageService
    )
  })

  it('registers shared libraries', async () => {

    const sharedLibs = [
      '@angular/animations',
      '@angular/core',
      '@angular/common',
      '@angular/common/http',
      '@angular/forms',
      '@angular/cdk/accordion',
      '@angular/cdk/bidi',
      '@angular/cdk/clipboard',
      '@angular/cdk/coercion',
      '@angular/cdk/collections',
      '@angular/cdk/drag-drop',
      '@angular/cdk/keycodes',
      '@angular/cdk/layout',
      '@angular/cdk/observers',
      '@angular/cdk/overlay',
      '@angular/cdk/platform',
      '@angular/cdk/portal',
      '@angular/cdk/scrolling',
      '@angular/cdk/stepper',
      '@angular/cdk/table',
      '@angular/cdk/text-field',
      '@angular/cdk/tree',
      '@angular/material/autocomplete',
      '@angular/material/badge',
      '@angular/material/bottom-sheet',
      '@angular/material/button',
      '@angular/material/button-toggle',
      '@angular/material/card',
      '@angular/material/checkbox',
      '@angular/material/chips',
      '@angular/material/core',
      '@angular/material/datepicker',
      '@angular/material/dialog',
      '@angular/material/divider',
      '@angular/material/expansion',
      '@angular/material/form-field',
      '@angular/material/grid-list',
      '@angular/material/icon',
      '@angular/material/input',
      '@angular/material/list',
      '@angular/material/menu',
      '@angular/material/paginator',
      '@angular/material/progress-bar',
      '@angular/material/progress-spinner',
      '@angular/material/radio',
      '@angular/material/select',
      '@angular/material/sidenav',
      '@angular/material/slide-toggle',
      '@angular/material/slider',
      '@angular/material/snack-bar',
      '@angular/material/sort',
      '@angular/material/stepper',
      '@angular/material/table',
      '@angular/material/tabs',
      '@angular/material/toolbar',
      '@angular/material/tooltip',
      '@angular/material/tree',
      'rxjs',
      'rxjs/operators',
      '@ngageoint/mage.web-core-lib',
      '@ngageoint/mage.web-core-lib/common',
      '@ngageoint/mage.web-core-lib/feed',
      '@ngageoint/mage.web-core-lib/plugin',
      '@ngageoint/mage.web-core-lib/paging',
      '@ngageoint/mage.web-core-lib/static-icon',
      '@ngageoint/mage.web-core-lib/user'
    ]
    sharedLibs.forEach((moduleId: string) => {
      expect(system.register).toHaveBeenCalledWith(moduleId, [], jasmine.anything())
    })
    expect(system.register.calls.count()).toEqual(sharedLibs.length)
  })

  describe('available plugins', () => {

    it('fetches and imports plugin modules but does not compile', async () => {

      const Plugin1NgModule = class {}
      const Plugin2NgModule = class {}
      const pluginsById: PluginsById = {
        plugin1: {
          MAGE_WEB_HOOKS: {
            module: Plugin1NgModule
          }
        },
        plugin2: {
          MAGE_WEB_HOOKS: {
            module: Plugin2NgModule
          }
        }
      }
      mockClient.get.and.returnValue(of(Object.keys(pluginsById)))
      system.import.withArgs(`/ui_plugins/plugin1?access_token=${token}`).and.returnValue(Promise.resolve(pluginsById.plugin1))
      system.import.withArgs(`/ui_plugins/plugin2?access_token=${token}`).and.returnValue(Promise.resolve(pluginsById.plugin2))
      const plugins = await service.availablePlugins()

      expect(plugins).toEqual(pluginsById)
      expect(mockClient.get).toHaveBeenCalledTimes(1)
      expect(system.import).toHaveBeenCalledWith(`/ui_plugins/plugin1?access_token=${token}`)
      expect(system.import).toHaveBeenCalledWith(`/ui_plugins/plugin2?access_token=${token}`)
      expect(system.import).toHaveBeenCalledTimes(2)
    })

    it('saves the imported plugins and does not fetch again', async () => {

      const Plugin1NgModule = class {}
      const pluginsById: PluginsById = {
        plugin1: {
          MAGE_WEB_HOOKS: {
            module: Plugin1NgModule
          }
        }
      }
      mockClient.get.and.returnValue(of(Object.keys(pluginsById)))
      system.import.withArgs(`/ui_plugins/plugin1?access_token=${token}`).and.returnValue(Promise.resolve(pluginsById.plugin1))
      const plugins = await service.availablePlugins()
      const pluginsAgain = await service.availablePlugins()

      expect(plugins).toEqual(pluginsById)
      expect(pluginsAgain).toEqual(pluginsById)
      expect(mockClient.get).toHaveBeenCalledTimes(1)
      expect(system.import).toHaveBeenCalledWith(`/ui_plugins/plugin1?access_token=${token}`)
      expect(system.import).toHaveBeenCalledTimes(1)
    })
  })
})