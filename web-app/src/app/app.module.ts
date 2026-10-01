import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ApplicationRef, DoBootstrap } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { RouteReuseStrategy } from '@angular/router';
import { AppRoutingModule } from './routing.module';
import { RouteReuseByComponentStrategy } from './route-reuse.strategy';
import { LocalStorageService } from './http/local-storage.service';
import { TokenInterceptorService } from './http/token.interceptor';
import { BannerModule } from './banner/banner.module';
import { IngressModule } from './ingress/ingress.module';

@NgModule({ declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent], imports: [AppRoutingModule,
        CommonModule,
        BrowserModule,
        MatDialogModule,
        BannerModule,
        IngressModule], providers: [
        provideAnimations(),
        LocalStorageService,
        TokenInterceptorService,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: RouteReuseStrategy, useClass: RouteReuseByComponentStrategy },
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule implements DoBootstrap {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public ngDoBootstrap(_appRef: ApplicationRef): void { }
}