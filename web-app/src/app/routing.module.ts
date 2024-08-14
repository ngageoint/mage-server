import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MageComponent } from './mage/mage.component';
import { ApiResolver } from './api/api.resolver';
import { UserResolver } from './ingress/user.resolver';
import { AboutComponent } from './about/about.component';
import { ProfileComponent } from './user/profile/profile.component';
import { LandingComponent } from './landing/landing.component';

const appRoutes: Routes = [{
  path: '',
  redirectTo:'/landing',
  pathMatch: 'full'
},{
  path: 'landing',
  component: LandingComponent,
  resolve: {
    api: ApiResolver
  }
},{
  path: 'map',
  component: MageComponent,
  resolve: { user: UserResolver }

},{
  path: 'about',
  component: AboutComponent
},{
  path: 'profile',
  component: ProfileComponent,
  resolve: {
    user: UserResolver
  }
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