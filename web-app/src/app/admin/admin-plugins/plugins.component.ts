import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PluginService, PluginsById } from '../plugin/plugin.service';

export interface AdminPluginListItem {
  id: string;
  title: string;
  icon?: { path: string } | { matIconName: string } | null;
}

@Component({
    selector: 'mage-plugins',
    templateUrl: './plugins.component.html',
    styleUrls: ['./plugins.component.scss'],
    imports: [RouterModule]
})
export class PluginsComponent implements OnInit {
  private readonly pluginService = inject(PluginService);

  plugins: AdminPluginListItem[] = [];
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const pluginsById: PluginsById = await this.pluginService.availablePlugins();

      this.plugins = Object.entries(pluginsById)
        .map(([id, bundle]) => {
          const tab = bundle.MAGE_WEB_HOOKS?.adminTab;
          return {
            id,
            title: tab?.title ?? id,
            icon: tab?.icon ?? null
          } as AdminPluginListItem;
        })
        .sort((a, b) => a.title.localeCompare(b.title));
    } catch (e) {
      this.error.set('Failed to load plugins.');
    } finally {
      this.loading.set(false);
    }
  }
}
