import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { ApiResolver } from './authentication/api.resolver';
import { AuthenticationComponent } from './authentication/authentication.component';
import { AuthorizeComponent } from './authentication/authorize.component';
import { MageComponent } from './mage/mage.component';

const appRoutes: Routes = [{
  path: '',
  redirectTo:'/landing/signin',
  pathMatch: 'full'
},{
  path: 'landing',
  component: LandingComponent,
  children: [{
    path: '',
    redirectTo: 'signin',
    pathMatch: 'full'
  },{
    path: 'signin',
    component: AuthenticationComponent,
    resolve: {
      api: ApiResolver
    }
  },{
    path: 'authorize',
    component: AuthorizeComponent,
  }]
},{
  path: 'map',
  component: MageComponent
}];

@NgModule({
  imports: [
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: true } // <-- debugging purposes only
    )
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule { }