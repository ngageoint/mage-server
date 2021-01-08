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

import {
  MatIcon,
  MatButton,
  MatToolbar,
  MatSpinner,
  MatFormField,
  MatIconModule,
  MatButtonModule,
  MatChipsModule,
  MatToolbarModule,
  MatProgressSpinnerModule,
  MatFormFieldModule,
  MatInputModule,
  MatAutocompleteModule,
  MatSelectModule,
  MatTooltipModule,
  MatCardModule,
  MatListModule,
  MatRippleModule,
  MatSidenavModule,
  MatSidenav,
  MatSidenavContent,
  MatSidenavContainer,
  MatRadioModule,
  MatCheckboxModule,
  MatSliderModule,
  MatExpansionModule,
  MatSnackBarModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatButtonToggleModule,
  MatProgressBarModule,
  MatGridListModule,
  MatDialogModule,
  MatTabsModule,
  MatBadgeModule
} from '@angular/material';

import { MatDatetimepickerModule } from '@nader-eloshaiker/mat-datetimepicker'
import { MatMomentDatetimeModule } from '@nader-eloshaiker/mat-datetimepicker-moment'

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
import { ObservationFormComponent } from './observation/observation-form/observation-form.component';
import { ObservationListComponent } from './observation/observation-list/observation-list.component';
import { UserViewComponent } from './user/user-view/user-view.component';
import { UserListItemComponent } from './user/user-list/user-list-item.component';
import { UserListComponent } from './user/user-list/user-list.component';
import { FeedComponent } from './feed/feed.component';

import {
  mapServiceProvider,
  eventServiceProvider,
  localStorageServiceProvider,
  geometryServiceProvider,
  observationServiceProvider,
  filterServiceProvider,
  userServiceProvider } from './upgrade/ajs-upgraded-providers';

import { 
  ObservationViewCheckboxComponent,
  ObservationViewDateComponent,
  ObservationViewGeometryComponent,
  ObservationViewMultiselectdropdownComponent,
  ObservationViewTextComponent,
  ObservationViewTextareaComponent
} from './observation/observation-view/observation-view';

import {
  MinValueDirective,
  MaxValueDirective,
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
    MinValueDirective,
    MaxValueDirective,
    MGRSValidatorDirective,
    ObservationListItemComponent,
    ObservationEditComponent,
    ObservationDeleteComponent,
    ObservationEditFormComponent,
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
    ObservationViewTextComponent,
    ObservationViewTextareaComponent,
    ObservationViewCheckboxComponent,
    ObservationViewDateComponent,
    ObservationViewGeometryComponent,
    ObservationViewMultiselectdropdownComponent,
    ObservationViewFormComponent,
    ObservationFavoritesComponent,
    ObservationFormComponent,
    ObservationListComponent,
    MapClipComponent,
    BootstrapComponent,
    AttachmentComponent,
    FilenamePipe,
    AttachUploadComponent,
    UserAvatarComponent,
    UserViewComponent,
    UserListItemComponent,
    UserListComponent,
    FeedComponent,
    ObservationPopupComponent,
    UserPopupComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    UpgradeModule,
    UIRouterUpgradeModule.forRoot({ states: [] }),
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    DragDropModule,
    MatBadgeModule,
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
    CheckboardModule
  ],
  providers: [
    mapServiceProvider,
    userServiceProvider,
    filterServiceProvider,
    eventServiceProvider,
    geometryServiceProvider,
    observationServiceProvider,
    localStorageServiceProvider,
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true }
  ],
  bootstrap: [],
  entryComponents: [
    MatIcon,
    MatButton,
    MatToolbar,
    MatSpinner,
    MatFormField,
    MatSidenav,
    MatSidenavContent,
    MatSidenavContainer,
    BootstrapComponent,
    FeedComponent,
    ObservationDeleteComponent,
    ObservationFavoritesComponent,
    ObservationListItemComponent,
    ObservationPopupComponent,
    UserViewComponent,
    UserAvatarComponent,
    UserPopupComponent,
    LeafletComponent,
    ZoomComponent,
    SearchComponent,
    LocationComponent,
    AddObservationComponent,
    LayersControlComponent,
    SwaggerComponent,
    ColorPickerComponent
  ]
})
export class AppModule {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public ngDoBootstrap(): void {}
}
