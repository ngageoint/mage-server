import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";
import { UIRouterUpgradeModule } from "@uirouter/angular-hybrid";

import { ImageComponent } from './mage-image.component';
import { Ng2StateDeclaration } from '@uirouter/angular';

const CHILD_STATES: [Ng2StateDeclaration] = [{
  name: "admin.plugins.image",
  url: "/image",
  component: ImageComponent
}];

@NgModule({
  declarations: [ImageComponent],
  imports: [
    CommonModule,
    UIRouterUpgradeModule.forChild({ states: CHILD_STATES })
  ],
  exports: [ImageComponent]
})
export class PluginModule {
  static rootState() {
    return 'admin.plugins.image';
  }

  // static name() {
  //   return '/api/plugins/image.umd.js';
  // }
}