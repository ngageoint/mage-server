import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ApplicationRef, DoBootstrap } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { AppRoutingModule } from './routing.module';
import { LocalStorageService } from './http/local-storage.service';
import { TokenInterceptorService } from './http/token.interceptor';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    AppRoutingModule,
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatDialogModule
  ],
  bootstrap: [ AppComponent ],
  providers: [
    LocalStorageService,
    TokenInterceptorService,
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true }
  ]
})
export class AppModule implements DoBootstrap {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public ngDoBootstrap(_appRef: ApplicationRef): void { }
}