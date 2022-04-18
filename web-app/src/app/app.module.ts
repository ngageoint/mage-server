import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

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

import { ZoomComponent } from './map/controls/zoom.component';
import { AddObservationComponent } from './map/controls/add-observation.component';
import { SwaggerComponent } from './swagger/swagger.component';

import { LocationComponent } from './map/controls/location.component';
import { SearchComponent } from './map/controls/search.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LayersComponent } from './map/layers/layers.component'
import { LayersControlComponent } from './map/controls/layers-control.component';
import { LeafletComponent } from './map/leaflet.component';
import { LeafletDirective } from './map/leaflet.upgrade.component';
import { LayerHeaderComponent } from './map/layers/layer-header.component';
import { LayerContentComponent } from './map/layers/layer-content.component';
import { ColorPickerComponent } from './color-picker/color-picker.component';
import { ExportComponent } from './export/export.component';
import { ExportDialogComponent } from "./export/export-dialog.component";

import { MapClipComponent } from './map/clip/clip.component';
import { GeometryModule } from './geometry/geometry.module';
import { ObservationDeleteComponent } from './observation/observation-delete/observation-delete.component';
import { ObservationListItemComponent } from './observation/observation-list/observation-list-item.component';
import { MomentModule } from './moment/moment.module';
import { BootstrapComponent } from './bootstrap/bootstrap.component';
import { AttachmentComponent } from './observation/attachment/attachment.component';
import { FilenamePipe } from './filename/filename.pipe';
import { AttachUploadComponent } from './observation/attachment/attachment-upload/attachment-upload.component';
import { ObservationViewFormComponent } from './observation/observation-view/observation-view-form.component';
import { ObservationViewComponent } from './observation/observation-view/observation-view.component';
import { ObservationFavoritesComponent } from './observation/observation-favorites/observation-favorites.component';
import { UserAvatarComponent } from './user/user-avatar/user-avatar.component';
import { TokenInterceptorService } from './http/token-interceptor.service';
import { ObservationListComponent } from './observation/observation-list/observation-list.component';
import { UserViewComponent } from './user/user-view/user-view.component';
import { UserListItemComponent } from './user/user-list/user-list-item.component';
import { UserListComponent } from './user/user-list/user-list.component';
import { FeedPanelComponent } from './feed-panel/feed-panel.component';

import {
  mapServiceProvider,
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
  ObservationViewCheckboxComponent,
  ObservationViewDateComponent,
  ObservationViewGeometryComponent,
  ObservationViewMultiselectdropdownComponent,
  ObservationViewTextComponent,
  ObservationViewTextareaComponent
} from './observation/observation-view/observation-view';

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

import { ObservationPopupComponent } from './observation/observation-popup/observation-popup.component';
import { UserPopupComponent } from './user/user-popup/user-popup.component';
import { AdminSettingsComponent } from './admin/admin-settings/admin-settings.component';
import { AdminBreadcrumbModule } from './admin/admin-breadcrumb/admin-breadcrumb.module';
import { SecurityBannerComponent, SecurityDisclaimerComponent } from './admin/admin-settings/admin-settings';
import { DatetimePickerComponent } from './datetime-picker/datetime-picker.component';
import { CommonModule } from '@angular/common';
import { ObservationOptionsComponent } from './observation/observation-view/observation-options.component';
import { ObservationEditFormPickerComponent } from './observation/observation-edit/observation-edit-form-picker.component';
import { ObservationEditDiscardComponent } from './observation/observation-edit/observation-edit-discard/observation-edit-discard.component';
import { ObservationViewAttachmentComponent } from './observation/observation-view/observation-view-attachment/observation-view-attachment.component';
import { ObservationEditAttachmentComponent } from './observation/observation-edit/observation-edit-attachment/observation-edit-attachment.component';
import { ObservationEditPasswordComponent } from './observation/observation-edit/observation-edit-password/observation-edit-password.component';
import { ObservationViewPasswordComponent } from './observation/observation-view/observation-view-password/observation-view-password.component';
import { PasswordPipe } from './observation/observation-view/observation-view-password/password.pipe';
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

@NgModule({
  declarations: [
    SwaggerComponent,
    ZoomComponent,
    AddObservationComponent,
    LocationComponent,
    SearchComponent,
    LayersControlComponent,
    LeafletComponent,
    LeafletDirective,
    LayersComponent,
    LayerHeaderComponent,
    LayerContentComponent,
    ColorPickerComponent,
    DMSValidatorDirective,
    MGRSValidatorDirective,
    FeedPanelComponent,
    ObservationListItemComponent,
    ObservationEditComponent,
    ObservationDeleteComponent,
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
    ObservationViewComponent,
    ObservationViewAttachmentComponent,
    ObservationViewTextComponent,
    ObservationViewTextareaComponent,
    ObservationViewCheckboxComponent,
    ObservationViewDateComponent,
    ObservationViewGeometryComponent,
    ObservationViewMultiselectdropdownComponent,
    ObservationViewFormComponent,
    ObservationFavoritesComponent,
    ObservationListComponent,
    ObservationOptionsComponent,
    MapClipComponent,
    BootstrapComponent,
    AttachmentComponent,
    FilenamePipe,
    AttachUploadComponent,
    UserAvatarComponent,
    UserViewComponent,
    UserListItemComponent,
    UserListComponent,
    FeedPanelComponent,
    ObservationPopupComponent,
    UserPopupComponent,
    AdminSettingsComponent,
    PasswordPolicyComponent,
    AccountLockComponent,
    AuthenticationCreateComponent,
    AuthenticationDeleteComponent,
    SecurityBannerComponent,
    SecurityDisclaimerComponent,
    IconUploadComponent,
    DatetimePickerComponent,
    ExportComponent,
    ExportDialogComponent,
    ObservationEditFormPickerComponent,
    ObservationOptionsComponent,
    ObservationEditDiscardComponent,
    ObservationEditPasswordComponent,
    ObservationViewPasswordComponent,
    PasswordPipe,
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
    AdminEventFormPreviewDialogComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    HttpClientModule,
    UpgradeModule,
    UIRouterUpgradeModule.forRoot({ states: [] }),
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
    NgxMatSelectSearchModule,
    MatChipsModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatProgressBarModule,
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
    MatNativeDateModule,
    AdminBreadcrumbModule,
    MatSlideToggleModule,
    MatStepperModule
  ],
  providers: [
    mapServiceProvider,
    userServiceProvider,
    filterServiceProvider,
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
export class AppModule {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public ngDoBootstrap(): void {}
}
