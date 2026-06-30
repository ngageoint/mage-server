import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin-shell/admin.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { UserDashboardComponent } from './admin-users/dashboard/user-dashboard.component';
import { DeviceDashboardComponent } from './admin-devices/dashboard/devices-dashboard.component';
import { TeamDashboardComponent } from './admin-teams/dashboard/team-dashboard.component';
import { EventDashboardComponent } from './admin-event/dashboard/event-dashboard.component';
import { LayerDashboardComponent } from './admin-layers/dashboard/layer-dashboard.component';
import { AdminFeedComponent } from './admin-feeds/admin-feed/admin-feed.component';
import { AdminMapComponent } from './admin-map/admin-map.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AdminAuthenticationComponent } from './admin-authentication/admin-authentication.component';
import { UserDetailsComponent } from './admin-users/user-details/user-details.component';
import { TeamDetailsComponent } from './admin-teams/team-details/team-details.component';
import { AuthenticationCreateComponent } from './admin-authentication/admin-authentication-create/admin-authentication-create.component';
import { DeviceDetailsComponent } from './admin-devices/device-details/device-details.component';
import { FormDetailsComponent } from './admin-event/admin-event-form/form-details/form-details.component';
import { EventDetailsComponent } from './admin-event/event-details/event-details.component';
import { AdminFeedEditComponent } from './admin-feeds/admin-feed/admin-feed-edit/admin-feed-edit.component';
import { AdminFeedsComponent } from './admin-feeds/admin-feeds.component';
import { AdminServiceComponent } from './admin-feeds/admin-service/admin-service.component';
import { LayerDetailsComponent } from './admin-layers/layer-details/layer-details.component';
import { AdminGuard } from './services/admin-guard.service';
import { PluginsComponent } from './admin-plugins/plugins.component';
import { PluginHostComponent } from './admin-plugins/host/plugins-host.component';
import { AdminUnsavedChangesGuard } from './services/admin-unsaved-changes.guard'

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UserDashboardComponent },
      { path: 'users/:userId', component: UserDetailsComponent },

      { path: 'teams', component: TeamDashboardComponent },
      { path: 'teams/:teamId', component: TeamDetailsComponent },

      { path: 'events', component: EventDashboardComponent },
      { path: 'events/:eventId', component: EventDetailsComponent },
      { path: 'events/:eventId/forms/:formId', component: FormDetailsComponent },

      {
        path: 'events/:eventId/forms/:formId',
        component: FormDetailsComponent
      },

      { path: 'devices', component: DeviceDashboardComponent },
      { path: 'devices/:deviceId', component: DeviceDetailsComponent },

      { path: 'layers', component: LayerDashboardComponent },
      { path: 'layers/:layerId', component: LayerDetailsComponent },

      { path: 'feeds', component: AdminFeedsComponent },
      { path: 'feeds/new', component: AdminFeedEditComponent },
      { path: 'feeds/:feedId', component: AdminFeedComponent },
      { path: 'feeds/:feedId/edit', component: AdminFeedEditComponent },

      { path: 'services/:serviceId', component: AdminServiceComponent },

      { path: 'map', component: AdminMapComponent },

      {
        path: 'security',
        component: AdminAuthenticationComponent,
        canDeactivate: [AdminUnsavedChangesGuard]
      },
      { path: 'security/new', component: AuthenticationCreateComponent },

      {
        path: 'settings',
        component: AdminSettingsComponent,
        canDeactivate: [AdminUnsavedChangesGuard]
      },

      {
        path: 'plugins',
        component: PluginsComponent,
        children: [
          { path: ':pluginId', component: PluginHostComponent }
        ]
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
