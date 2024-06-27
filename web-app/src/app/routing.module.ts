import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { AuthenticationComponent } from './authentication/authentication.component';
import { AuthorizeComponent } from './authentication/authorize.component';
import { MageComponent } from './mage/mage.component';
import { ApiResolver } from './api/api.resolver';
import { UserResolver } from './authentication/user.resolver';
import { AboutComponent } from './about/about.component';

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
  component: MageComponent,
  resolve: {
    user: UserResolver
  }
},{
  path: 'about',
  component: AboutComponent
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