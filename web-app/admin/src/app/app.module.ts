import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ApplicationRef, DoBootstrap } from '@angular/core';

import { UpgradeModule } from '@angular/upgrade/static';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { SaturationModule, HueModule, CheckboardModule, AlphaModule } from 'ngx-color';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';

import { MatDatetimepickerModule } from '@mat-datetimepicker/core'
import { MatMomentDatetimeModule } from '@mat-datetimepicker/moment'
import { InputMaskModule } from '@ngneat/input-mask'

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ColorPickerComponent } from './color-picker/color-picker.component';

import { MapClipComponent } from './map/clip/clip.component';
import { GeometryModule } from './geometry/geometry.module';
import { MomentModule } from './moment/moment.module';
import { BootstrapComponent } from './bootstrap/bootstrap.component';
import { AttachmentComponent } from './observation/attachment/attachment.component';
import { FilenamePipe } from './filename/filename.pipe';
import { AttachUploadComponent } from './observation/attachment/attachment-upload/attachment-upload.component';
import { UserAvatarComponent } from './user/user-avatar/user-avatar.component';
import { TokenInterceptorService } from './http/token-interceptor.service';

import {
  mapServiceProvider,
  eventResourceProvider,
  eventServiceProvider,
  localStorageServiceProvider,
  geometryServiceProvider,
  observationServiceProvider,
  filterServiceProvider,
  locationServiceProvider,
  userServiceProvider,
  settingsProvider,
  teamProvider,
  eventProvider,
  authenticationConfigurationServiceProvider,
  userPagingServiceProvider
} from './upgrade/ajs-upgraded-providers';

import {
  DMSValidatorDirective,
  MGRSValidatorDirective,
  ObservationEditCheckboxComponent,
  ObservationEditDateComponent,
  ObservationEditSelectComponent,
  ObservationEditEmailComponent,
  ObservationEditGeometryComponent,
  ObservationEditGeometryFormComponent,
  ObservationEditGeometryMapComponent,
  ObservationEditMultiselectComponent,
  ObservationEditNumberComponent,
  ObservationEditRadioComponent,
  ObservationEditTextComponent,
  ObservationEditTextareaComponent,
  ObservationEditFormComponent,
  ObservationEditComponent
} from './observation/observation-edit/observation-edit';

import { FeedItemComponent } from './feed/feed-item/feed-item.component';
import { FeedItemSummaryModule } from './feed/feed-item/feed-item-summary/feed-item-summary.module';
import { AdminFeedsModule } from './admin/admin-feeds/admin-feeds.module';
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon'
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common'
import { AdminModule } from './admin/admin.module'
import { AdminSettingsComponent } from './admin/admin-settings/admin-settings.component';
import { AdminBreadcrumbModule } from './admin/admin-breadcrumb/admin-breadcrumb.module';
import { ContactInfoComponent } from './admin/admin-settings/admin-settings';
import { SecurityBannerComponent, SecurityDisclaimerComponent } from './admin/admin-settings/admin-settings';
import { DatetimePickerComponent } from './datetime-picker/datetime-picker.component';
import { CommonModule } from '@angular/common';
import { ObservationEditFormPickerComponent } from './observation/observation-edit/observation-edit-form-picker.component';
import { ObservationEditDiscardComponent } from './observation/observation-edit/observation-edit-discard/observation-edit-discard.component';
import { ObservationEditAttachmentComponent } from './observation/observation-edit/observation-edit-attachment/observation-edit-attachment.component';
import { ObservationEditPasswordComponent } from './observation/observation-edit/observation-edit-password/observation-edit-password.component';
import { ContactComponent } from './contact/contact.component';
import { ContactDialogComponent } from "./contact/contact-dialog.component";
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
import { AdminEventFormPreviewComponent } from './admin/admin-event/admin-event-form/admin-event-form-preview/admin-event-form-preview.component';
import { AdminEventFormPreviewDialogComponent } from './admin/admin-event/admin-event-form/admin-event-form-preview/admin-event-form-preview-dialog.component';
import { AdminMapComponent } from './admin/admin-map/admin-map.component';


@NgModule({
  declarations: [
    ColorPickerComponent,
    DMSValidatorDirective,
    MGRSValidatorDirective,
    FeedItemComponent,
    ObservationEditComponent,
    ObservationEditAttachmentComponent,
    ObservationEditFormComponent,
    ObservationEditFormPickerComponent,
    ObservationEditMultiselectComponent,
    ObservationEditCheckboxComponent,
    ObservationEditSelectComponent,
    ObservationEditEmailComponent,
    ObservationEditNumberComponent,
    ObservationEditTextComponent,
    ObservationEditTextareaComponent,
    ObservationEditRadioComponent,
    ObservationEditGeometryComponent,
    ObservationEditGeometryMapComponent,
    ObservationEditGeometryFormComponent,
    ObservationEditDateComponent,
    MapClipComponent,
    BootstrapComponent,
    AttachmentComponent,
    FilenamePipe,
    AttachUploadComponent,
    UserAvatarComponent,
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
    ObservationEditDiscardComponent,
    ObservationEditPasswordComponent,
    ContactComponent,
    ContactDialogComponent,
    AdminAuthenticationOidcComponent,
    AdminAuthenticationLocalComponent,
    AdminAuthenticationComponent,
    AdminAuthenticationOAuth2Component,
    AdminAuthenticationLDAPComponent,
    AdminAuthenticationSAMLComponent,
    ButtonPreviewComponent,
    AdminAuthenticationSettingsComponent,
    AdminSettingsUnsavedComponent,
    AdminEventFormPreviewComponent,
    AdminEventFormPreviewDialogComponent,
    AdminMapComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    HttpClientModule,
    UpgradeModule,
    UIRouterUpgradeModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    DragDropModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatMomentDatetimeModule,
    MatDatetimepickerModule,
    MatToolbarModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatButtonModule,
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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSnackBarModule,
    MatDatepickerModule,
    NgxMatSelectSearchModule,
    AdminModule,
    AdminFeedsModule,
    FeedItemSummaryModule,
    StaticIconModule,
    AdminBreadcrumbModule,
    MatSlideToggleModule,
    MatStepperModule,
    InputMaskModule.forRoot()
  ],
  providers: [
    mapServiceProvider,
    userServiceProvider,
    filterServiceProvider,
    eventResourceProvider,
    eventServiceProvider,
    geometryServiceProvider,
    observationServiceProvider,
    localStorageServiceProvider,
    locationServiceProvider,
    settingsProvider,
    teamProvider,
    eventProvider,
    authenticationConfigurationServiceProvider,
    userPagingServiceProvider,
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true }
  ]
})
export class AppModule implements DoBootstrap {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public ngDoBootstrap(appRef: ApplicationRef): void {
  }
}
