import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { UpgradeModule } from '@angular/upgrade/static';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { 
  MatIcon,
  MatButton,
  MatToolbar,
  MatSpinner,
  MatFormField,
  MatIconModule,
  MatButtonModule,
  MatToolbarModule,
  MatProgressSpinnerModule,
  MatFormFieldModule,
  MatInputModule,
  MatAutocompleteModule,
  MatSelectModule,
  MatSelect
} from '@angular/material';

import { SwaggerComponent } from './swagger/swagger.component';
import { DropdownComponent } from './observation/edit/dropdown/dropdown.component';

import app from '../ng1/app.js';

@NgModule({
  declarations: [SwaggerComponent, DropdownComponent],
  imports: [
    BrowserModule,
    UpgradeModule,
    UIRouterUpgradeModule.forRoot({ states: [] }),
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    ScrollingModule
  ],
  providers: [],
  bootstrap: [],
  entryComponents:[MatIcon, MatButton, MatToolbar, MatSpinner, MatFormField, DropdownComponent, SwaggerComponent]
})
export class AppModule { 
  constructor(private upgrade: UpgradeModule) { }

  public ngDoBootstrap() {
    this.upgrade.bootstrap(document.body, [app.name]);
  }
}