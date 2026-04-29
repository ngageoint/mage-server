import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PluginsComponent } from './plugins.component';
import { PluginHostComponent } from './host/plugins-host.component';
import { CommonModule } from '@angular/common';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';

@NgModule({
  imports: [
    PluginsComponent,
    PluginHostComponent,
    CommonModule,
    AdminBreadcrumbModule,
    RouterModule.forChild([{ path: '', component: PluginsComponent }])
  ]
})
export class PluginModule {}
