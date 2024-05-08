import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './routing.module';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { InfoComponent } from './landing/info.component';
import { LandingComponent } from './landing/landing.component';
import { AuthenticationComponent } from './authentication/authentication.component';
import { LocalComponent } from './authentication/local/local.component';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthorizeComponent } from './authentication/authorize.component';
import { MatIconModule } from '@angular/material/icon';
import { MapComponent } from './map/map.component';
import { MageComponent } from './mage/mage.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core';

@NgModule({
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  declarations: [
    AppComponent,
    LandingComponent,
    InfoComponent,
    AuthenticationComponent,
    AuthorizeComponent,
    LocalComponent,
    MageComponent,
    MapComponent
  ],
  bootstrap: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }