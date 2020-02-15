import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { UpgradeModule } from '@angular/upgrade/static';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';

import app from '../ng1/app.js';
import { SwaggerComponent } from './swagger/swagger.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { 
  MatIcon,
  MatButton,
  MatToolbar,
  MatSpinner,
  MatIconModule,
  MatButtonModule,
  MatToolbarModule,
  MatProgressSpinnerModule
} from '@angular/material';

@NgModule({
  declarations: [SwaggerComponent],
  imports: [
    BrowserModule,
    UpgradeModule,
    UIRouterUpgradeModule.forRoot({ states: [] }),
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  providers: [],
  bootstrap: [],
  entryComponents:[MatIcon, MatButton, MatToolbar, MatSpinner, SwaggerComponent]
})
export class AppModule { 
  constructor(private upgrade: UpgradeModule) { }

  public ngDoBootstrap() {
    this.upgrade.bootstrap(document.body, [app.name]);
  }
}