import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminBreadcrumbComponent } from './admin-breadcrumb.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    AdminBreadcrumbComponent
  ],
  imports: [
    CommonModule,
    MatIconModule
  ],
  exports: [
    AdminBreadcrumbComponent
  ]
})
export class AdminBreadcrumbModule { }
