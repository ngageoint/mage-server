import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin-shell/admin.component';

import { AdminNavComponent } from './admin-nav/admin-nav';
import { AdminBreadcrumbModule } from './admin-breadcrumb/admin-breadcrumb.module';
import { AdminPluginTabContentComponent } from './plugin-tab/plugin-tab-content.component';

import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AdminTeamsModule } from './admin-teams/admin-teams.module';
import { AdminEventsModule } from './admin-event/admin-events.module';
import { AdminLayersModule } from './admin-layers/admin-layers.module';
import { AdminDevicesModule } from './admin-devices/admin-devices.module';
import { AdminFeedsModule } from './admin-feeds/admin-feeds.module';
import { AdminEventFormModule } from './admin-event/admin-event-form/admin-event-form.module';

import { AdminGuard } from './services/admin-guard.service';

import { PluginModule } from './admin-plugins/plugins.module';
import { RouterModule } from '@angular/router';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AdminBreadcrumbModule,
    AdminRoutingModule,
    AdminDashboardModule,
    AdminUsersModule,
    AdminTeamsModule,
    AdminEventsModule,
    AdminLayersModule,
    AdminDevicesModule,
    AdminFeedsModule,
    AdminEventFormModule,
    PluginModule,
    RouterModule
  ],
  declarations: [
    AdminComponent,
    AdminNavComponent,
    AdminPluginTabContentComponent
  ],
  exports: [AdminComponent],
  providers: [AdminGuard]
})
export class AdminModule {}
