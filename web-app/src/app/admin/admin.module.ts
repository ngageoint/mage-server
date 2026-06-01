import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatStepperModule } from '@angular/material/stepper';
import { InputMaskModule } from '@ngneat/input-mask';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin-shell/admin.component';
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
import { AdminMapModule } from './admin-map/admin-map.module';
import { AdminSettingsModule } from './admin-settings/admin-settings.module';
import { ColorPickerModule } from '../color-picker/color-picker.module';

import { SearchModalComponent } from './search-modal/search-modal.component';
import { AdminGuard } from './services/admin-guard.service';
import { AdminNavigationComponent } from './admin-navigation/admin-navigation.component';
import { AdminNavbarComponent } from './admin-shell/admin-navbar/admin-navbar.component';
import { PluginModule } from './admin-plugins/plugins.module';

import { AdminAuthenticationComponent } from './admin-authentication/admin-authentication.component';
import { AdminAuthenticationSettingsComponent } from './admin-authentication/admin-authentication-settings.component';
import { AuthenticationCreateComponent } from './admin-authentication/admin-authentication-create/admin-authentication-create.component';
import { AuthenticationDeleteComponent } from './admin-authentication/admin-authentication-delete/admin-authentication-delete.component';
import { ButtonPreviewComponent } from './admin-authentication/admin-authentication-create/button-preview/button-preview.component';
import { IconUploadComponent } from './admin-authentication/admin-authentication-create/icon-upload/icon-upload.component';
import { AdminAuthenticationOidcComponent } from './admin-authentication/admin-authentication-oidc/admin-authentication-oidc.component';
import { AdminAuthenticationLocalComponent } from './admin-authentication/admin-authentication-local/admin-authentication-local.component';
import { AdminAuthenticationOAuth2Component } from './admin-authentication/admin-authentication-oauth2/admin-authentication-oauth2.component';
import { AdminAuthenticationLDAPComponent } from './admin-authentication/admin-authentication-ldap/admin-authentication-ldap.component';
import { AdminAuthenticationSAMLComponent } from './admin-authentication/admin-authentication-saml/admin-authentication-saml.component';
import { PasswordPolicyComponent } from './admin-authentication/admin-authentication-local/password-policy/password-policy.component';
import { AccountLockComponent } from './admin-authentication/admin-authentication-local/account-lock/account-lock.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatRadioModule,
    MatSelectModule,
    MatSidenavModule,
    MatSlideToggleModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatListModule,
    MatPaginatorModule,
    MatStepperModule,
    InputMaskModule,
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
    AdminMapModule,
    AdminSettingsModule,
    ColorPickerModule,
    PluginModule
  ],
  declarations: [
    SearchModalComponent,
    AdminComponent,
    AdminNavbarComponent,
    AdminNavigationComponent,
    AdminPluginTabContentComponent,
    AdminAuthenticationComponent,
    AdminAuthenticationSettingsComponent,
    AuthenticationCreateComponent,
    AuthenticationDeleteComponent,
    ButtonPreviewComponent,
    IconUploadComponent,
    AdminAuthenticationOidcComponent,
    AdminAuthenticationLocalComponent,
    AdminAuthenticationOAuth2Component,
    AdminAuthenticationLDAPComponent,
    AdminAuthenticationSAMLComponent,
    PasswordPolicyComponent,
    AccountLockComponent
  ],
  exports: [AdminComponent],
  providers: [AdminGuard]
})
export class AdminModule {}
