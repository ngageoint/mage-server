import {
  Component,
  OnInit,
  Type,
  ViewChild,
  ViewContainerRef,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PluginService } from '../../plugin/plugin.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { RouteReuse } from '../../../route-reuse.strategy';

@Component({
    selector: 'mage-plugins-host',
    templateUrl: './plugins-host.component.html',
    styleUrls: ['./plugins-host.component.scss'],
    imports: [RouterModule]
})
export class PluginHostComponent implements OnInit {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  private readonly route = inject(ActivatedRoute);
  private readonly pluginService = inject(PluginService);
  private readonly breadcrumbService = inject(AdminBreadcrumbService);

  @ViewChild('host', { read: ViewContainerRef, static: true })
  host!: ViewContainerRef;

  readonly pluginId: string | null = this.route.snapshot.paramMap.get('pluginId');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private _breadcrumbs: AdminBreadcrumb[] = [{ title: 'Plugin', icon: 'extension' }];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this._breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this._breadcrumbs;
  }

  async ngOnInit(): Promise<void> {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    const pluginId = this.pluginId;
    if (!pluginId) {
      this.error.set('No plugin id provided.');
      this.loading.set(false);
      return;
    }

    try {
      const plugins = await this.pluginService.availablePlugins();
      const plugin = plugins[pluginId];

      if (!plugin?.MAGE_WEB_HOOKS) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      const moduleRef = await this.pluginService.loadPluginModule(pluginId);

      const hooks: any = plugin.MAGE_WEB_HOOKS;
      const tab = hooks.adminTab;

      this.breadcrumbs = [{
        title: tab?.title ?? pluginId,
        icon: tab?.icon?.icon ?? 'extension'
      }];

      let entry: Type<any> | undefined =
        hooks.rootComponent ?? hooks.entryComponent;

      if (!entry) {
        const exportKeys = Object.keys(plugin);

        const componentKeys = exportKeys.filter((k) =>
          k.endsWith('Component')
        );
        const getExport = (k: string) => (plugin as any)[k];

        const isComponentType = (v: any) => typeof v === 'function';

        const componentCandidates = componentKeys
          .map((k) => ({ key: k, value: getExport(k) }))
          .filter((x) => isComponentType(x.value));

        const pickByName = (re: RegExp) =>
          componentCandidates.find((c) => re.test(c.key))?.value as
            | Type<any>
            | undefined;

        if (componentCandidates.length === 1) {
          entry = componentCandidates[0].value as Type<any>;
        } else {
          entry =
            pickByName(/AdminComponent$/) ??
            pickByName(/ConfigurationComponent$/) ??
            pickByName(/RootComponent$/) ??
            pickByName(/MainComponent$/);

          if (!entry) {
            const exportedKeys = exportKeys.sort();
            const hookKeys = hooks ? Object.keys(hooks).sort() : [];
            const candidateNames = componentCandidates
              .map((c) => c.key)
              .sort();

            throw new Error(
              `Plugin "${pluginId}" does not expose a renderable entry component. ` +
                `Exports: [${exportedKeys.join(', ')}], ` +
                `MAGE_WEB_HOOKS: [${hookKeys.join(', ')}], ` +
                `adminTab: ${JSON.stringify(hooks.adminTab)}, ` +
                `component candidates: [${candidateNames.join(', ')}].`
            );
          }
        }
      }

      if (!entry) {
        throw new Error(
          `Plugin "${pluginId}" did not provide an entry component.`
        );
      }

      this.host.createComponent(entry, { injector: moduleRef.injector });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load plugin.');
    } finally {
      this.loading.set(false);
    }
  }
}
