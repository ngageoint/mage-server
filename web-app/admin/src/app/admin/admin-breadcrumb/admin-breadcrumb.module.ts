import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminBreadcrumbComponent } from './admin-breadcrumb.component';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AdminBreadcrumbComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule,
  ],
  exports: [
    AdminBreadcrumbComponent
  ],
  providers: [
    {
      provide: '$state',
      useFactory: (i: any) => i.get('$state'),
      deps: ['$injector']
    }     
  ]
})
export class AdminBreadcrumbModule { }
