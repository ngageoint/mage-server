import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DragDropModule } from '@angular/cdk/drag-drop';

import {
  SaturationModule,
  HueModule,
  CheckboardModule,
  AlphaModule
} from 'ngx-color';

import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatCheckboxModule as MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule as MatChipsModule } from '@angular/material/chips';
import { MatRippleModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatMomentDateModule } from '@angular/material-moment-adapter'
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatListModule as MatListModule } from '@angular/material/list';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule as MatRadioModule } from '@angular/material/radio';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule as MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule as MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatTabsModule as MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule as MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatMenuModule as MatMenuModule } from '@angular/material/menu';

import { InputMaskModule } from '@ngneat/input-mask';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { ColorPickerComponent } from './color-picker/color-picker.component';

import { GeometryModule } from './geometry/geometry.module';
import { MomentModule } from './moment/moment.module';
import { BootstrapComponent } from './bootstrap/bootstrap.component';
import { UserAvatarComponent } from './user/user-avatar/user-avatar.component';
import { TokenInterceptorService } from './http/token-interceptor.service';
import { AuthBufferInterceptor } from './services/auth-buffer.interceptor';

import {
  DMSValidatorDirective,
  MGRSValidatorDirective
} from './observation/observation-edit/observation-edit';

import { FeedItemComponent } from './feed/feed-item/feed-item.component';
import { FeedItemSummaryModule } from './feed/feed-item/feed-item-summary/feed-item-summary.module';
import { AdminFeedsModule } from './admin/admin-feeds/admin-feeds.module';
import { StaticIconModule } from 'core-lib-src/static-icon';
import { MageCommonModule } from 'core-lib-src/common';
import { AdminModule } from './admin/admin.module';
import { AdminSettingsComponent } from './admin/admin-settings/admin-settings.component';
import { AdminBreadcrumbModule } from './admin/admin-breadcrumb/admin-breadcrumb.module';
import { ContactInfoComponent } from './admin/admin-settings/admin-settings';
import {
  SecurityBannerComponent,
  SecurityDisclaimerComponent
} from './admin/admin-settings/admin-settings';
import { DatetimePickerComponent } from './datetime-picker/datetime-picker.component';
import { ContactModule } from './contact/contact.module';
import { BannerComponent } from './banner/banner.component';
import { AdminAuthenticationOidcComponent } from './admin/admin-authentication/admin-authentication-oidc/admin-authentication-oidc.component';
import { AuthenticationDeleteComponent } from './admin/admin-authentication/admin-authentication-delete/admin-authentication-delete.component';
import { AdminAuthenticationLocalComponent } from './admin/admin-authentication/admin-authentication-local/admin-authentication-local.component';
import { PasswordPolicyComponent } from './admin/admin-authentication/admin-authentication-local//password-policy/password-policy.component';
import { AccountLockComponent } from './admin/admin-authentication/admin-authentication-local//account-lock/account-lock.component';
import { AdminAuthenticationComponent } from './admin/admin-authentication/admin-authentication.component';
import { IconUploadComponent } from './admin/admin-authentication/admin-authentication-create/icon-upload/icon-upload.component';
import { AuthenticationCreateComponent } from './admin/admin-authentication/admin-authentication-create/admin-authentication-create.component';
import { AdminAuthenticationOAuth2Component } from './admin/admin-authentication/admin-authentication-oauth2/admin-authentication-oauth2.component';
import { AdminAuthenticationLDAPComponent } from './admin/admin-authentication/admin-authentication-ldap/admin-authentication-ldap.component';
import { AdminAuthenticationSAMLComponent } from './admin/admin-authentication/admin-authentication-saml/admin-authentication-saml.component';
import { ButtonPreviewComponent } from './admin/admin-authentication/admin-authentication-create/button-preview/button-preview.component';
import { AdminAuthenticationSettingsComponent } from './admin/admin-authentication/admin-authentication-settings.component';
import { AdminSettingsUnsavedComponent } from './admin/admin-settings/admin-settings-unsaved/admin-settings-unsaved.component';
import { AdminEventFormModule } from './admin/admin-event/admin-event-form/admin-event-form.module';
import { AdminMapComponent } from './admin/admin-map/admin-map.component';
import { AdminTeamsModule } from './admin/admin-teams/admin-teams.module';
import { AdminEventsModule } from './admin/admin-event/admin-events.module';
import { AdminLayersModule } from './admin/admin-layers/admin-layers.module';
import { AdminDashboardModule } from './admin/admin-dashboard/admin-dashboard.module';
import { AdminUsersModule } from './admin/admin-users/admin-users.module';
import { ObservationModule } from './observation/observation.module';
import { AdminDevicesModule } from './admin/admin-devices/admin-devices.module';
import { AdminNavigationComponent } from './navigation/admin-navigation.component';
import { AuthenticationModule } from './authentication/authentication.module';
import { AppRoutingModule } from './routing.module';

@NgModule({
  declarations: [
    ColorPickerComponent,
    DMSValidatorDirective,
    MGRSValidatorDirective,
    FeedItemComponent,
    BootstrapComponent,
    UserAvatarComponent,
    BannerComponent,
    AdminSettingsComponent,
    PasswordPolicyComponent,
    AccountLockComponent,
    AuthenticationCreateComponent,
    AuthenticationDeleteComponent,
    SecurityBannerComponent,
    SecurityDisclaimerComponent,
    IconUploadComponent,
    ContactInfoComponent,
    DatetimePickerComponent,
    AdminAuthenticationOidcComponent,
    AdminAuthenticationLocalComponent,
    AdminAuthenticationComponent,
    AdminAuthenticationOAuth2Component,
    AdminAuthenticationLDAPComponent,
    AdminAuthenticationSAMLComponent,
    ButtonPreviewComponent,
    AdminAuthenticationSettingsComponent,
    AdminSettingsUnsavedComponent,
    AdminMapComponent,
    AdminNavigationComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    DragDropModule,
    ObservationModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatToolbarModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatButtonModule,
    MatMenuModule,
    MatCardModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatRadioModule,
    MatCheckboxModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatSliderModule,
    MatExpansionModule,
    MatListModule,
    MatRippleModule,
    MatChipsModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MageCommonModule,
    MomentModule,
    GeometryModule,
    ScrollingModule,
    SaturationModule,
    HueModule,
    AlphaModule,
    CheckboardModule,
    NgxMatSelectSearchModule,
    AdminModule,
    AdminTeamsModule,
    AdminUsersModule,
    AdminEventsModule,
    AdminLayersModule,
    AdminEventFormModule,
    AdminFeedsModule,
    FeedItemSummaryModule,
    StaticIconModule,
    AdminBreadcrumbModule,
    MatSlideToggleModule,
    MatStepperModule,
    InputMaskModule.forRoot(),
    AdminDashboardModule,
    AdminDevicesModule,
    AuthenticationModule,
    ContactModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthBufferInterceptor, multi: true }
  ],
  bootstrap: [BootstrapComponent]
})
export class AppModule {}
