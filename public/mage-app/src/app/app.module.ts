import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { UpgradeModule } from '@angular/upgrade/static';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';

import app from '../ng1/app.js';
import { SwaggerComponent } from './swagger/swagger.component';

@NgModule({
  declarations: [SwaggerComponent],
  imports: [
    BrowserModule,
    UpgradeModule,
    UIRouterUpgradeModule.forRoot({ states: [] })
  ],
  providers: [],
  bootstrap: [],
  entryComponents:[SwaggerComponent]
})
export class AppModule { 
  constructor(private upgrade: UpgradeModule) { }

  public ngDoBootstrap() {
    this.upgrade.bootstrap(document.body, [app.name]);
  }
}