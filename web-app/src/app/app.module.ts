import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ApplicationRef, DoBootstrap } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { AppRoutingModule } from './routing.module';
import { LocalStorageService } from './http/local-storage.service';
import { TokenInterceptorService } from './http/token.interceptor';
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common';

@NgModule({ declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent], imports: [AppRoutingModule,
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        MatDialogModule,
        MageCommonModule], providers: [
        LocalStorageService,
        TokenInterceptorService,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule implements DoBootstrap {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public ngDoBootstrap(_appRef: ApplicationRef): void { }
}