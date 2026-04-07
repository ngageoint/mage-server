import * as ngAnimations from '@angular/animations';
import * as ngCore from '@angular/core';
import * as ngCommon from '@angular/common';
import * as ngCommonHttp from '@angular/common/http';
import * as ngForms from '@angular/forms';
import * as ngCdkAccordian from '@angular/cdk/accordion';
import * as ngCdkBidi from '@angular/cdk/bidi';
import * as ngCdkClipboard from '@angular/cdk/clipboard';
import * as ngCdkCoercion from '@angular/cdk/coercion';
import * as ngCdkCollections from '@angular/cdk/collections';
import * as ngCdkDragDrop from '@angular/cdk/drag-drop';
import * as ngCdkKeycodes from '@angular/cdk/keycodes';
import * as ngCdkLayout from '@angular/cdk/layout';
import * as ngCdkObservers from '@angular/cdk/observers';
import * as ngCdkOverlay from '@angular/cdk/overlay';
import * as ngCdkPlatform from '@angular/cdk/platform';
import * as ngCdkPortal from '@angular/cdk/portal';
import * as ngCdkScrolling from '@angular/cdk/scrolling';
import * as ngCdkStepper from '@angular/cdk/stepper';
import * as ngCdkTable from '@angular/cdk/table';
import * as ngCdkTextField from '@angular/cdk/text-field';
import * as ngCdkTree from '@angular/cdk/tree';
import * as ngMatAutocomplete from '@angular/material/autocomplete';
import * as ngMatBadge from '@angular/material/badge';
import * as ngMatBottomSheet from '@angular/material/bottom-sheet';
import * as ngMatButton from '@angular/material/button';
import * as ngMatButtonToggle from '@angular/material/button-toggle';
import * as ngMatCard from '@angular/material/card';
import * as ngMatCheckbox from '@angular/material/checkbox';
import * as ngMatChips from '@angular/material/chips';
import * as ngMatCore from '@angular/material/core';
import * as ngMatDatepicker from '@angular/material/datepicker';
import * as ngMatDialog from '@angular/material/dialog';
import * as ngMatDivider from '@angular/material/divider';
import * as ngMatExpansion from '@angular/material/expansion';
import * as ngMatFormField from '@angular/material/form-field';
import * as ngMatGridList from '@angular/material/grid-list';
import * as ngMatIcon from '@angular/material/icon';
import * as ngMatInput from '@angular/material/input';
import * as ngMatList from '@angular/material/list';
import * as ngMatMenu from '@angular/material/menu';
import * as ngMatPaginator from '@angular/material/paginator';
import * as ngMatProgressBar from '@angular/material/progress-bar';
import * as ngMatProgressSpinner from '@angular/material/progress-spinner';
import * as ngMatRadio from '@angular/material/radio';
import * as ngMatSelect from '@angular/material/select';
import * as ngMatSidenav from '@angular/material/sidenav';
import * as ngMatSlideToggle from '@angular/material/slide-toggle';
import * as ngMatSlider from '@angular/material/slider';
import * as ngMatSnackBar from '@angular/material/snack-bar';
import * as ngMatSort from '@angular/material/sort';
import * as ngMatStepper from '@angular/material/stepper';
import * as ngMatTable from '@angular/material/table';
import * as ngMatTabs from '@angular/material/tabs';
import * as ngMatToolbar from '@angular/material/toolbar';
import * as ngMatTooltip from '@angular/material/tooltip';
import * as ngMatTree from '@angular/material/tree';
import * as rxjs from 'rxjs';
import * as rxjsOperators from 'rxjs/operators';
import * as ngSelect from '@ng-select/ng-select';
import * as mageCore from '@ngageoint/mage.web-core-lib';
import * as mageCoreCommon from '@ngageoint/mage.web-core-lib/common';
import * as mageCoreFeed from '@ngageoint/mage.web-core-lib/feed';
import * as mageCorePlugin from '@ngageoint/mage.web-core-lib/plugin';
import * as mageCorePaging from '@ngageoint/mage.web-core-lib/paging';
import * as mageCoreStaticIcon from '@ngageoint/mage.web-core-lib/static-icon';
import * as mageCoreUser from '@ngageoint/mage.web-core-lib/user';

import {
  Inject,
  Injectable,
  Injector,
  NgModuleRef,
  createNgModule
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SystemJS, SYSTEMJS } from './systemjs.service';
import { PluginHooks } from 'core-lib-src/plugin';
import { LocalStorageService } from 'src/app/http/local-storage.service';

function registerSharedLibInContext(
  system: SystemJS.Context,
  libId: string,
  lib: any
): void {
  system.register(libId, [], (_export) => {
    return {
      execute: () => {
        _export(lib);
        return void 0;
      }
    };
  });
}

// --- tiny helper ---
function isUiPluginUrl(url: string): boolean {
  // handles absolute and relative forms
  return url.startsWith('/ui_plugins') || url.includes('/ui_plugins/');
}

@Injectable({ providedIn: 'root' })
export class PluginService {
  private pluginsPromise: Promise<PluginsById> | null = null;
  private pluginsToken: string | null = null;
  private fetchPatchInstalled = false;

  constructor(
    private webClient: HttpClient,
    private injector: Injector,
    @Inject(SYSTEMJS) private system: SystemJS.Registry,
    private localStorageService: LocalStorageService
  ) {
    // Register shared libs into SystemJS context (as you had)
    const shareLib = (libId: string, lib: any) =>
      registerSharedLibInContext(
        system as unknown as SystemJS.Context,
        libId,
        lib
      );
    const providedLibs: Record<string, any> = {
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
      rxjs: rxjs,
      'rxjs/operators': rxjsOperators,
      '@ng-select/ng-select': ngSelect,
      '@ngageoint/mage.web-core-lib': mageCore,
      '@ngageoint/mage.web-core-lib/common': mageCoreCommon,
      '@ngageoint/mage.web-core-lib/feed': mageCoreFeed,
      '@ngageoint/mage.web-core-lib/plugin': mageCorePlugin,
      '@ngageoint/mage.web-core-lib/paging': mageCorePaging,
      '@ngageoint/mage.web-core-lib/static-icon': mageCoreStaticIcon,
      '@ngageoint/mage.web-core-lib/user': mageCoreUser
    };

    Object.entries(providedLibs).forEach(([id, lib]) => shareLib(id, lib));

    this.installFetchAuthPatch();
  }

  private installFetchAuthPatch(): void {
    if (this.fetchPatchInstalled) return;
    const g: any = globalThis as any;
    if (!g.fetch) return;

    const originalFetch: typeof fetch = g.fetch.bind(g);

    g.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
            ? input.toString()
            : (input as Request).url;

        if (isUiPluginUrl(url)) {
          const token = this.localStorageService.getToken();
          if (token) {
            const headers = new Headers(
              (init && init.headers) ||
                (input instanceof Request ? input.headers : undefined)
            );
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${token}`);
            }

            if (input instanceof Request) {
              const req = new Request(input, { ...init, headers });
              return originalFetch(req);
            }
            return originalFetch(input as any, { ...init, headers });
          }
        }
      } catch {
        // fall through to normal fetch
      }

      return originalFetch(input as any, init);
    };

    this.fetchPatchInstalled = true;
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  async availablePlugins(): Promise<PluginsById> {
    const token = this.localStorageService.getToken();

    if (this.pluginsPromise && token !== this.pluginsToken) {
      this.pluginsPromise = null;
      this.pluginsToken = null;
    }

    if (this.pluginsPromise) return this.pluginsPromise;

    if (!token) {
      throw new Error('Cannot load UI plugins: missing auth token');
    }

    this.pluginsToken = token;

    this.pluginsPromise = (async () => {
      try {
        const moduleIds = await firstValueFrom(
          this.webClient.get<string[]>('/ui_plugins', {
            headers: this.authHeaders(token)
          })
        );

        const imports = moduleIds.map(
          async (moduleId): Promise<[string, PluginBundleModule | null]> => {
            const token = this.localStorageService.getToken();

            const pluginUrl = token
              ? `/ui_plugins/${moduleId}?access_token=${encodeURIComponent(
                  token
                )}`
              : `/ui_plugins/${moduleId}`;

            try {
              const pluginModule = await this.system.import<PluginBundleModule>(
                pluginUrl
              );
              return [moduleId, pluginModule];
            } catch (err) {
              console.error('error loading plugin', moduleId, err);
              return [moduleId, null];
            }
          }
        );

        const pluginModules = await Promise.all(imports);
        const pluginsById: PluginsById = {};

        for (const [id, mod] of pluginModules) {
          if (mod) pluginsById[id] = mod;
        }

        return pluginsById;
      } catch (err) {
        this.pluginsPromise = null;
        this.pluginsToken = null;
        throw err;
      }
    })();

    return this.pluginsPromise;
  }

  async loadPluginModule(pluginId: string): Promise<NgModuleRef<unknown>> {
    const plugins = await this.availablePlugins();
    const plugin = plugins[pluginId];
    if (!plugin) {
      throw new Error('plugin not found: ' + pluginId);
    }
    const hooks = plugin.MAGE_WEB_HOOKS;
    return createNgModule(hooks.module, this.injector);
  }
}

export interface PluginsById {
  [moduleId: string]: {
    MAGE_WEB_HOOKS: PluginHooks;
  };
}

export interface PluginBundleModule {
  MAGE_WEB_HOOKS: PluginHooks;
  [exported: string]: any;
}
