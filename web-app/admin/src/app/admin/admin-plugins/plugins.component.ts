import { Component, OnInit } from '@angular/core';
import { PluginService, PluginsById } from '../../plugin/plugin.service';

export interface AdminPluginListItem {
  id: string;
  title: string;
  icon?: { path: string } | { className: string } | null;
}

@Component({
  selector: 'mage-plugins',
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.scss']
})
export class PluginsComponent implements OnInit {
  plugins: AdminPluginListItem[] = [];
  loading = true;
  error: string | null = null;

  constructor(private pluginService: PluginService) {}

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
      this.error = 'Failed to load plugins.';
    } finally {
      this.loading = false;
    }
  }
}
