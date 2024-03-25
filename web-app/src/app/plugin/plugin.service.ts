import * as ngAnimations from '@angular/animations'
import * as ngCore from '@angular/core'
import * as ngCommon from '@angular/common'
import * as ngCommonHttp from '@angular/common/http'
import * as ngForms from '@angular/forms'
import * as ngCdkAccordian from '@angular/cdk/accordion'
import * as ngCdkBidi from '@angular/cdk/bidi'
import * as ngCdkClipboard from '@angular/cdk/clipboard'
import * as ngCdkCoercion from '@angular/cdk/coercion'
import * as ngCdkCollections from '@angular/cdk/collections'
import * as ngCdkDragDrop from '@angular/cdk/drag-drop'
import * as ngCdkKeycodes from '@angular/cdk/keycodes'
import * as ngCdkLayout from '@angular/cdk/layout'
import * as ngCdkObservers from '@angular/cdk/observers'
import * as ngCdkOverlay from '@angular/cdk/overlay'
import * as ngCdkPlatform from '@angular/cdk/platform'
import * as ngCdkPortal from '@angular/cdk/portal'
import * as ngCdkScrolling from '@angular/cdk/scrolling'
import * as ngCdkStepper from '@angular/cdk/stepper'
import * as ngCdkTable from '@angular/cdk/table'
import * as ngCdkTextField from '@angular/cdk/text-field'
import * as ngCdkTree from '@angular/cdk/tree'
import * as ngMatAutocomplete from '@angular/material/autocomplete'
import * as ngMatBadge from '@angular/material/badge'
import * as ngMatBottomSheet from '@angular/material/bottom-sheet'
import * as ngMatButton from '@angular/material/button'
import * as ngMatButtonToggle from '@angular/material/button-toggle'
import * as ngMatCard from '@angular/material/card'
import * as ngMatCheckbox from '@angular/material/checkbox'
import * as ngMatChips from '@angular/material/chips'
import * as ngMatCore from '@angular/material/core'
import * as ngMatDatepicker from '@angular/material/datepicker'
import * as ngMatDialog from '@angular/material/dialog'
import * as ngMatDivider from '@angular/material/divider'
import * as ngMatExpansion from '@angular/material/expansion'
import * as ngMatFormField from '@angular/material/form-field'
import * as ngMatGridList from '@angular/material/grid-list'
import * as ngMatIcon from '@angular/material/icon'
import * as ngMatInput from '@angular/material/input'
import * as ngMatList from '@angular/material/list'
import * as ngMatMenu from '@angular/material/menu'
import * as ngMatPaginator from '@angular/material/paginator'
import * as ngMatProgressBar from '@angular/material/progress-bar'
import * as ngMatProgressSpinner from '@angular/material/progress-spinner'
import * as ngMatRadio from '@angular/material/radio'
import * as ngMatSelect from '@angular/material/select'
import * as ngMatSidenav from '@angular/material/sidenav'
import * as ngMatSlideToggle from '@angular/material/slide-toggle'
import * as ngMatSlider from '@angular/material/slider'
import * as ngMatSnackBar from '@angular/material/snack-bar'
import * as ngMatSort from '@angular/material/sort'
import * as ngMatStepper from '@angular/material/stepper'
import * as ngMatTable from '@angular/material/table'
import * as ngMatTabs from '@angular/material/tabs'
import * as ngMatToolbar from '@angular/material/toolbar'
import * as ngMatTooltip from '@angular/material/tooltip'
import * as ngMatTree from '@angular/material/tree'
import * as rxjs from 'rxjs'
import * as rxjsOperators from 'rxjs/operators'
import * as mageCore from '@ngageoint/mage.web-core-lib'
import * as mageCoreCommon from '@ngageoint/mage.web-core-lib/common'
import * as mageCoreFeed from '@ngageoint/mage.web-core-lib/feed'
import * as mageCorePlugin from '@ngageoint/mage.web-core-lib/plugin'
import * as mageCorePaging from '@ngageoint/mage.web-core-lib/paging'
import * as mageCoreStaticIcon from '@ngageoint/mage.web-core-lib/static-icon'
import * as mageCoreUser from '@ngageoint/mage.web-core-lib/user'

import { Inject, Injectable, Injector, NgModuleRef, Compiler } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { SystemJS, SYSTEMJS } from './systemjs.service'
import { PluginHooks } from '@ngageoint/mage.web-core-lib/plugin'
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers'

function registerSharedLibInContext(system: SystemJS.Context, libId: string, lib: any): void {
  system.register(libId, [], _export => {
    return {
      execute: () => {
        _export(lib)
        // deliberate undefined return because returning something here screws
        // up systemjs
        return void(0)
      }
    }
  })
}

/**
 * TODO: Evaluate all of the imports of shared libraries and how they affect
 * memory usage, and whether they are necessary at all.  Perhaps instead we can
 * configure the angular/webpack build to chunk more optimally, such as only
 * including dependencies the app statically links in the main bundle, then
 * leave all other dependencies to dynamic imports.  We can also manipulate
 * chunking to some degree using dynamic import statements like
 * `import('@angular/material/seldomUsedModule')`.  However, that would
 * necessitate [customizing](https://github.com/systemjs/systemjs/blob/master/docs/hooks.md)
 * the SystemJS `import()` method to dynamically load the modules.
 *
 * Some notes:
 * * Static import statements like `import * as packageEntryPoint from '@scope/package/entryPoint`
 * cause webpack to bundle the imported library with the main bundle by default.
 * * Dynamic import statements that can be statically processed like
 * `const x = await import('@scope/package/entryPoint')` because they import by
 * a string literal reference supposedly cause webpack to create a separate
 * chunk for the script as long as it's not statically imported somewhere else.
 *
 */
@Injectable({
  providedIn: 'root'
})
export class PluginService {

  private plugins: Promise<PluginsById> | null = null

  constructor(
    private webClient: HttpClient,
    private compiler: Compiler,
    private injector: Injector,
    @Inject(SYSTEMJS)
    private system: SystemJS.Registry,
    @Inject(LocalStorageService)
    private localStorageService: LocalStorageService) {
    const shareLib = (libId: string, lib: any) => registerSharedLibInContext(system, libId, lib)
    const providedLibs = {
      '@angular/animations': ngAnimations,
      '@angular/core': ngCore,
      '@angular/common': ngCommon,
      '@angular/common/http': ngCommonHttp,
      '@angular/forms': ngForms,
      '@angular/cdk/accordion': ngCdkAccordian,
      '@angular/cdk/bidi': ngCdkBidi,
      '@angular/cdk/clipboard': ngCdkClipboard,
      '@angular/cdk/coercion': ngCdkCoercion,
      '@angular/cdk/collections': ngCdkCollections,
      '@angular/cdk/drag-drop': ngCdkDragDrop,
      '@angular/cdk/keycodes': ngCdkKeycodes,
      '@angular/cdk/layout': ngCdkLayout,
      '@angular/cdk/observers': ngCdkObservers,
      '@angular/cdk/overlay': ngCdkOverlay,
      '@angular/cdk/platform': ngCdkPlatform,
      '@angular/cdk/portal': ngCdkPortal,
      '@angular/cdk/scrolling': ngCdkScrolling,
      '@angular/cdk/stepper': ngCdkStepper,
      '@angular/cdk/table': ngCdkTable,
      '@angular/cdk/text-field': ngCdkTextField,
      '@angular/cdk/tree': ngCdkTree,
      '@angular/material/autocomplete': ngMatAutocomplete,
      '@angular/material/badge': ngMatBadge,
      '@angular/material/bottom-sheet': ngMatBottomSheet,
      '@angular/material/button': ngMatButton,
      '@angular/material/button-toggle': ngMatButtonToggle,
      '@angular/material/card': ngMatCard,
      '@angular/material/checkbox': ngMatCheckbox,
      '@angular/material/chips': ngMatChips,
      '@angular/material/core': ngMatCore,
      '@angular/material/datepicker': ngMatDatepicker,
      '@angular/material/dialog': ngMatDialog,
      '@angular/material/divider': ngMatDivider,
      '@angular/material/expansion': ngMatExpansion,
      '@angular/material/form-field': ngMatFormField,
      '@angular/material/grid-list': ngMatGridList,
      '@angular/material/icon': ngMatIcon,
      '@angular/material/input': ngMatInput,
      '@angular/material/list': ngMatList,
      '@angular/material/menu': ngMatMenu,
      '@angular/material/paginator': ngMatPaginator,
      '@angular/material/progress-bar': ngMatProgressBar,
      '@angular/material/progress-spinner': ngMatProgressSpinner,
      '@angular/material/radio': ngMatRadio,
      '@angular/material/select': ngMatSelect,
      '@angular/material/sidenav': ngMatSidenav,
      '@angular/material/slide-toggle': ngMatSlideToggle,
      '@angular/material/slider': ngMatSlider,
      '@angular/material/snack-bar': ngMatSnackBar,
      '@angular/material/sort': ngMatSort,
      '@angular/material/stepper': ngMatStepper,
      '@angular/material/table': ngMatTable,
      '@angular/material/tabs': ngMatTabs,
      '@angular/material/toolbar': ngMatToolbar,
      '@angular/material/tooltip': ngMatTooltip,
      '@angular/material/tree': ngMatTree,
      'rxjs': rxjs,
      'rxjs/operators': rxjsOperators,
      '@ngageoint/mage.web-core-lib': mageCore,
      '@ngageoint/mage.web-core-lib/common': mageCoreCommon,
      '@ngageoint/mage.web-core-lib/feed': mageCoreFeed,
      '@ngageoint/mage.web-core-lib/plugin': mageCorePlugin,
      '@ngageoint/mage.web-core-lib/paging': mageCorePaging,
      '@ngageoint/mage.web-core-lib/static-icon': mageCoreStaticIcon,
      '@ngageoint/mage.web-core-lib/user': mageCoreUser,
    }
    Object.entries(providedLibs).forEach((libEntry) => {
      shareLib(...libEntry)
    })
  }

  async availablePlugins(): Promise<PluginsById> {
    if (this.plugins) {
      return this.plugins
    }
    const token = this.localStorageService.getToken()
    this.plugins = new Promise(resolve => {
      this.webClient.get<string[]>('/ui_plugins').subscribe(async (moduleIds) => {
        const imports = moduleIds.map(moduleId => {
          return this.system.import<PluginBundleModule>(`/ui_plugins/${moduleId}?access_token=${token}`).then<[string, PluginBundleModule | null], [string, null]>(
            pluginModule => {
              return [ moduleId, pluginModule ]
            },
            err => {
              console.error('error loading plugin', moduleId, err)
              return [ moduleId, null ]
            }
          )
        })
        const pluginModules = await Promise.all(imports)
        const pluginsById = {} as PluginsById
        for (const plugin of pluginModules) {
          if (plugin[1]) {
            pluginsById[plugin[0]] = plugin[1]
          }
        }
        resolve(pluginsById)
      })
    })
    return this.plugins
  }

  async loadPluginModule(pluginId: string): Promise<NgModuleRef<unknown>> {
    const plugins = await this.availablePlugins()
    const plugin = plugins[pluginId]
    if (!plugin) {
      throw Error('plugin not found: ' + pluginId)
    }
    const hooks = plugin.MAGE_WEB_HOOKS
    const moduleFactory = await this.compiler.compileModuleAsync(hooks.module)
    const moduleRef = moduleFactory.create(this.injector)
    return moduleRef
  }
}

/**
 * A map whose keys are bare module/package IDs of plugins, e.g.
 * `@ngageoint/mage.web-core-lib`, and values are the `PluginHooks` object the
 * plugin module exports.
 */
export interface PluginsById {
  [moduleId: string]: {
    MAGE_WEB_HOOKS: PluginHooks
  }
}

export interface PluginBundleModule {
  MAGE_WEB_HOOKS: PluginHooks
  [exported: string]: any
}

