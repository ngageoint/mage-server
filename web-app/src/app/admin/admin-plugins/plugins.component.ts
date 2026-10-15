import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PluginService } from '../plugin/plugin.service';

@Component({
    selector: 'mage-plugins',
    templateUrl: './plugins.component.html',
    styleUrls: ['./plugins.component.scss'],
    imports: [RouterModule]
})
export class PluginsComponent implements OnInit {
  private readonly pluginService = inject(PluginService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.pluginService.availablePlugins();
    } catch (e) {
      this.error.set('Failed to load plugins.');
    } finally {
      this.loading.set(false);
    }
  }
}
