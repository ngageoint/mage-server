import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { SaturationModule, HueModule, CheckboardModule, AlphaModule } from 'ngx-color';

import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatCheckboxModule as MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule as MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatTimepickerModule } from '@angular/material/timepicker'
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
import { ColorPickerModule } from '../color-picker/color-picker.module';
import { ExportComponent } from '../export/export.component';
import { ExportCreateComponent } from '../export/export-create/export-create.component';
import { ExportListComponent } from '../export/export-list/export-list.component';
import { ExportListItemComponent } from '../export/export-list/export-list-item.component';
import { ExportViewComponent } from '../export/export-view/export-view.component';
import { ExportEmptyComponent } from '../export/export-empty/export-empty.component';

import { MapClipModule } from '../map/clip/map-clip.module';
import { GeometryModule } from '../geometry/geometry.module';
import { ObservationDeleteComponent } from '../observation/observation-delete/observation-delete.component';
import { ObservationListItemComponent } from '../observation/observation-list/observation-list-item.component';
import { MomentModule } from '../moment/moment.module';
import { ObservationAttachmentModule } from '../observation/attachment/observation-attachment.module';

import { ObservationViewFormComponent } from '../observation/observation-view/observation-view-form.component';
import { ObservationViewComponent } from '../observation/observation-view/observation-view.component';
import { ObservationFavoritesComponent } from '../observation/observation-favorites/observation-favorites.component';
import { ObservationListComponent } from '../observation/observation-list/observation-list.component';
import { UserViewComponent } from '../user/user-view/user-view.component';
import { UserListItemComponent } from '../user/user-list/user-list-item.component';
import { UserListComponent } from '../user/user-list/user-list.component';
import { FeedListComponent } from '../feed/feed-list/feed-list.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

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
  ObservationEditComponent
} from '../observation/observation-edit/observation-edit';
import { ObservationEditModule } from '../observation/observation-edit/observation-edit.module';

import { FeedItemComponent } from '../feed/feed-item/feed-item.component';
import { FeedItemMapPopupComponent } from '../feed/feed-item/feed-item-map/feed-item-map-popup.component';
import { FeedItemSummaryModule } from '../feed/feed-item/feed-item-summary/feed-item-summary.module';
import { SidebarTabComponent } from '../sidebar/sidebar-tab.component';
import { ObservationPopupComponent } from '../observation/observation-popup/observation-popup.component';
import { UserPopupComponent } from '../user/user-popup/user-popup.component';
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon'
import { DatetimePickerComponent } from '../datetime-picker/datetime-picker.component';
import { CommonModule } from '@angular/common';
import { ObservationOptionsComponent } from '../observation/observation-view/observation-options.component';
import { ObservationEditFormPickerComponent } from '../observation/observation-edit/observation-edit-form-picker.component';
import { ObservationEditDiscardComponent } from '../observation/observation-edit/observation-edit-discard/observation-edit-discard.component';
import { ObservationViewAttachmentComponent } from '../observation/observation-view/observation-view-attachment/observation-view-attachment.component';
import { ObservationViewPasswordComponent } from '../observation/observation-view/observation-view-password/observation-view-password.component';
import { PasswordPipe } from '../observation/observation-view/observation-view-password/password.pipe';
import { ContactDialogComponent } from '../contact/contact-dialog.component';
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
import { HomeGuard } from '../ingress/home-guard.service';
import { UserAvatarModule } from '../user/user-avatar/user-avatar.module';
import { IngressModule } from '../ingress/ingress.module';
import { FilterControlComponent } from '../map/controls/filter.component';
import { MatMenuModule as MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

const routes: Routes = [{
  path: '',
  component: HomeComponent,
  canActivate: [HomeGuard],
  resolve: {
    user: UserResolver
  }
}];

@NgModule({
  declarations: [],
  imports: [MatTimepickerModule],
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
    MatTimepickerModule,
    MatMomentDateModule,
    MatDialogModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
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
    ContactDialogComponent,
    CoordinateSystemComponent,
    DatetimePickerComponent,
    DMSValidatorDirective,
    ExportComponent,
    ExportCreateComponent,
    ExportEmptyComponent,
    ExportListComponent,
    ExportListItemComponent,
    ExportViewComponent,
    FeedItemComponent,
    FeedItemMapPopupComponent,
    FeedListComponent,
    FilterComponent,
    FilterControlComponent,
    HomeComponent,
    LayerContentComponent,
    LayerHeaderComponent,
    LayersComponent,
    LayersControlComponent,
    LocationComponent,
    MapComponent,
    MapComponent,
    MGRSValidatorDirective,

    NavigationComponent,
    ObservationDeleteComponent,
    ObservationEditComponent,
    ObservationEditDiscardComponent,
    ObservationEditFormPickerComponent,
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
    SidebarComponent,
    SidebarTabComponent,
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
    ColorPickerModule,
    FeedItemSummaryModule,
    GeometryModule,
    MapClipModule,
    IngressModule,
    MomentModule,
    ObservationAttachmentModule,
    ObservationEditModule,
    StaticIconModule,
    UserAvatarModule,
    InputMaskModule.forRoot(),
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class HomeModule {
}