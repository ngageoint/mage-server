import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing.component';
import { InfoComponent } from './info.component';
import { RouterModule, Routes } from '@angular/router';
import { ApiResolver } from '../api/api.resolver';
import { IngressModule } from '../ingress/ingress.module';

const routes: Routes = [{
  path: '',
  component: LandingComponent,
  resolve: {
    api: ApiResolver
  }
}];

@NgModule({
  declarations: [
    LandingComponent,
    InfoComponent
  ],
  imports: [
    CommonModule,
    IngressModule,
    RouterModule.forChild(routes)
  ],
  exports: [ RouterModule ]
})
export class LandingModule { }