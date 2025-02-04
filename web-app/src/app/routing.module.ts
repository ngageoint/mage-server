import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const appRoutes: Routes =[{
    path: 'landing',
    loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule)
  },{
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule)
  },{
    path: 'about',
    loadChildren: () => import('./about/about.module').then(m => m.AboutModule)
  },{
    path: 'profile',
    loadChildren: () => import('./user/profile/profile.module').then(m => m.ProfileModule)
  },{
    path: 'swagger',
    loadChildren: () => import('./swagger/swagger.module').then(m => m.SwaggerModule)
  },{
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  }, {
    path: '**',
    redirectTo: 'landing'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      appRoutes,
      // { enableTracing: true } // <-- debugging purposes only
    )
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule { }