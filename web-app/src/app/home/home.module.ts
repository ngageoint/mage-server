import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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

import { ZoomComponent } from '../map/controls/zoom.component';
import { AddObservationComponent } from '../map/controls/add-observation.component';

import { LocationComponent } from '../map/controls/location.component';
import { SearchComponent } from '../map/controls/search.component';
import { LayersComponent } from '../map/layers/layers.component'
import { LayersControlComponent } from '../map/controls/layers-control.component';
import { MapComponent } from '../map/map.component';
import { LayerHeaderComponent } from '../map/layers/layer-header.component';
import { LayerContentComponent } from '../map/layers/layer-content.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import { ExportComponent } from '../export/export.component';
import { ExportDialogComponent } from '../export/export-dialog.component'

import { MapClipComponent } from '../map/clip/clip.component';
import { GeometryModule } from '../geometry/geometry.module';
import { ObservationDeleteComponent } from '../observation/observation-delete/observation-delete.component';
import { ObservationListItemComponent } from '../observation/observation-list/observation-list-item.component';
import { MomentModule } from '../moment/moment.module';
import { AttachmentComponent } from '../observation/attachment/attachment.component';
import { FilenamePipe } from '../filename/filename.pipe';
import { AttachUploadComponent } from '../observation/attachment/attachment-upload/attachment-upload.component';
import { ObservationViewFormComponent } from '../observation/observation-view/observation-view-form.component';
import { ObservationViewComponent } from '../observation/observation-view/observation-view.component';
import { ObservationFavoritesComponent } from '../observation/observation-favorites/observation-favorites.component';
import { ObservationListComponent } from '../observation/observation-list/observation-list.component';
import { UserViewComponent } from '../user/user-view/user-view.component';
import { UserListItemComponent } from '../user/user-list/user-list-item.component';
import { UserListComponent } from '../user/user-list/user-list.component';
import { FeedListComponent } from '../feed/feed-list/feed-list.component';
import { FeedPanelComponent } from '../feed-panel/feed-panel.component';

import {
  ObservationViewCheckboxComponent,
  ObservationViewDateComponent,
  ObservationViewGeometryComponent,
  ObservationViewMultiselectdropdownComponent,
  ObservationViewTextComponent,
  ObservationViewTextareaComponent
} from '../observation/observation-view/observation-view';

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
} from '../observation/observation-edit/observation-edit';

import { FeedItemComponent } from '../feed/feed-item/feed-item.component';
import { FeedItemMapPopupComponent } from '../feed/feed-item/feed-item-map/feed-item-map-popup.component';
import { FeedItemSummaryModule } from '../feed/feed-item/feed-item-summary/feed-item-summary.module';
import { FeedPanelTabComponent } from '../feed-panel/feed-panel-tab.component';
import { ObservationPopupComponent } from '../observation/observation-popup/observation-popup.component';
import { UserPopupComponent } from '../user/user-popup/user-popup.component';
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon'
import { DatetimePickerComponent } from '../datetime-picker/datetime-picker.component';
import { CommonModule } from '@angular/common';
import { ObservationOptionsComponent } from '../observation/observation-view/observation-options.component';
import { ObservationEditFormPickerComponent } from '../observation/observation-edit/observation-edit-form-picker.component';
import { ObservationEditDiscardComponent } from '../observation/observation-edit/observation-edit-discard/observation-edit-discard.component';
import { ObservationViewAttachmentComponent } from '../observation/observation-view/observation-view-attachment/observation-view-attachment.component';
import { ObservationEditAttachmentComponent } from '../observation/observation-edit/observation-edit-attachment/observation-edit-attachment.component';
import { ObservationEditPasswordComponent } from '../observation/observation-edit/observation-edit-password/observation-edit-password.component';
import { ObservationViewPasswordComponent } from '../observation/observation-view/observation-view-password/observation-view-password.component';
import { PasswordPipe } from '../observation/observation-view/observation-view-password/password.pipe';
import { ContactDialogComponent } from '../contact/contact-dialog.component';
import { ExportDataComponent } from '../export/export-data/export-data.component';
import { NoExportsComponent } from '../export/empty-state/no-exports.component';
import { NavigationComponent } from '../navigation/navigation.component';
import { FilterComponent } from '../filter/filter.component';
import { PreferencesComponent } from '../preferences/preferences.component';
import { PollingIntervalComponent } from '../preferences/polling-interval/polling-interval.component';
import { TimeFormatComponent } from '../preferences/time-format/time-format.component';
import { TimeZoneComponent } from '../preferences/time-zone/time-zone.component';
import { CoordinateSystemComponent } from '../preferences/coordinate-system/coordinate-system.component';
import { PasswordResetSuccessDialog } from '../user/password/password-reset-success-dialog';
import { HomeComponent } from '..//home/home.component';
import { RouterModule, Routes } from '@angular/router';
import { UserResolver } from '../ingress/user.resolver';
import { UserAvatarModule } from '../user/user-avatar/user-avatar.module';
import { IngressModule } from '../ingress/ingress.module';
import { FilterControlComponent } from '../map/controls/filter.component';
import { ExportControlComponent } from '../map/controls/export.component';
import { BannerModule } from '../banner/banner.module';

const routes: Routes = [{
  path: '',
  component: HomeComponent,
  resolve: {
    user: UserResolver
  }
}];

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    AlphaModule,
    CheckboardModule,
    CommonModule,
    FormsModule,
    HueModule,
    ReactiveFormsModule,
    DragDropModule,
    MatAutocompleteModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDatetimepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatMomentDatetimeModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatSortModule,
    MatStepperModule,
    MatTableModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatListModule,
    NgxMatSelectSearchModule,
    ScrollingModule,
    SaturationModule
  ]
})
class AngularModule { }

@NgModule({
  declarations: [
    AddObservationComponent,
    AttachmentComponent,
    AttachUploadComponent,
    ColorPickerComponent,
    ContactDialogComponent,
    CoordinateSystemComponent,
    DatetimePickerComponent,
    DMSValidatorDirective,
    ExportComponent,
    ExportControlComponent,
    ExportDataComponent,
    ExportDialogComponent,
    FeedItemComponent,
    FeedItemMapPopupComponent,
    FeedListComponent,
    FeedPanelComponent,
    FeedPanelTabComponent,
    FilenamePipe,
    FilterComponent,
    FilterControlComponent,
    HomeComponent,
    LayerContentComponent,
    LayerHeaderComponent,
    LayersComponent,
    LayersControlComponent,
    LocationComponent,
    MapClipComponent,
    MapComponent,
    MapComponent,
    MGRSValidatorDirective,
    NavigationComponent,
    NoExportsComponent,
    ObservationDeleteComponent,
    ObservationEditAttachmentComponent,
    ObservationEditCheckboxComponent,
    ObservationEditComponent,
    ObservationEditDateComponent,
    ObservationEditDiscardComponent,
    ObservationEditEmailComponent,
    ObservationEditFormComponent,
    ObservationEditFormPickerComponent,
    ObservationEditGeometryComponent,
    ObservationEditGeometryFormComponent,
    ObservationEditGeometryMapComponent,
    ObservationEditMultiselectComponent,
    ObservationEditNumberComponent,
    ObservationEditPasswordComponent,
    ObservationEditRadioComponent,
    ObservationEditSelectComponent,
    ObservationEditTextareaComponent,
    ObservationEditTextComponent,
    ObservationFavoritesComponent,
    ObservationListComponent,
    ObservationListItemComponent,
    ObservationOptionsComponent,
    ObservationPopupComponent,
    ObservationViewAttachmentComponent,
    ObservationViewCheckboxComponent,
    ObservationViewComponent,
    ObservationViewDateComponent,
    ObservationViewFormComponent,
    ObservationViewGeometryComponent,
    ObservationViewMultiselectdropdownComponent,
    ObservationViewPasswordComponent,
    ObservationViewTextareaComponent,
    ObservationViewTextComponent,
    PasswordPipe,
    PasswordResetSuccessDialog,
    PollingIntervalComponent,
    PreferencesComponent,
    SearchComponent,
    TimeFormatComponent,
    TimeZoneComponent,
    UserListComponent,
    UserListItemComponent,
    UserPopupComponent,
    UserViewComponent,
    ZoomComponent,
  ],
  imports: [
    AngularModule,
    BannerModule,
    FeedItemSummaryModule,
    GeometryModule,
    IngressModule,
    MomentModule,
    StaticIconModule,
    UserAvatarModule,
    InputMaskModule.forRoot(),
    RouterModule.forChild(routes)
  ],
  exports: [ RouterModule ]
})
export class HomeModule {
}