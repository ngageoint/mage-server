import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { UpgradeModule } from '@angular/upgrade/static';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DragDropModule } from '@angular/cdk/drag-drop';

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
  MatExpansionModule
} from '@angular/material';

import { ZoomComponent } from './map/controls/zoom.component';
import { AddObservationComponent } from './map/controls/add-observation.component';
import { SwaggerComponent } from './swagger/swagger.component';
import { ScrollWrapperComponent } from './wrapper/scroll/feed-scroll.component';
import { DropdownComponent } from './observation/edit/dropdown/dropdown.component';
import { MultiSelectDropdownComponent } from './observation/edit/multiselectdropdown/multiselectdropdown.component';

import app from '../ng1/app.js';
import { LocationComponent } from './map/controls/location.component';
import { SearchComponent } from './map/controls/search.component';
import { HttpClientModule } from '@angular/common/http';
import { LayersComponent } from './map/layers/layers.component'
import { LayersControlComponent } from './map/controls/layers-control.component';
import { LeafletComponent } from './map/leaflet.component';
import { LeafletDirective } from './map/leaflet.upgrade.component';
import { LayerHeaderComponent } from './map/layers/layer-header.component';
import { LayerContentComponent } from './map/layers/layer-content.component';

@NgModule({
  declarations: [
    SwaggerComponent, 
    DropdownComponent, 
    MultiSelectDropdownComponent, 
    ScrollWrapperComponent, 
    ZoomComponent, 
    AddObservationComponent, 
    LocationComponent, 
    SearchComponent, 
    LayersControlComponent, 
    LeafletComponent,
    LeafletDirective,
    LayersComponent,
    LayerHeaderComponent,
    LayerContentComponent
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
    MatToolbarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatCardModule,
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
    ScrollingModule
  ],
  providers: [],
  bootstrap: [],
  entryComponents:[
    MatIcon, 
    MatButton, 
    MatToolbar, 
    MatSpinner, 
    MatFormField,
    MatSidenav,
    MatSidenavContent,
    MatSidenavContainer,
    DropdownComponent, 
    MultiSelectDropdownComponent,
    LeafletComponent,
    ZoomComponent,
    SearchComponent,
    LocationComponent,
    AddObservationComponent,
    LayersControlComponent,
    ScrollWrapperComponent,
    SwaggerComponent]
})
export class AppModule { 
  constructor(private upgrade: UpgradeModule) { }

  public ngDoBootstrap() {
    this.upgrade.bootstrap(document.body, [app.name]);
  }
}