import {
  Component,
  OnDestroy,
  OnInit,
  Type,
  ViewChild,
  ViewContainerRef,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { PluginService } from '../../plugin/plugin.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';

@Component({
    selector: 'mage-plugins-host',
    templateUrl: './plugins-host.component.html',
    styleUrls: ['./plugins-host.component.scss'],
    imports: [RouterModule]
})
export class PluginHostComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly pluginService = inject(PluginService);
  private readonly breadcrumbService = inject(AdminBreadcrumbService);

  @ViewChild('host', { read: ViewContainerRef, static: true })
  host!: ViewContainerRef;

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

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (params) => {
        const pluginId = params.get('pluginId');
        if (!pluginId) return;

        this.loading.set(true);
        this.error.set(null);
        this.host.clear();

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
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
