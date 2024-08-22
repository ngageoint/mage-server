import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [{
  path: '',
  component: AboutComponent
}];

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    CommonModule,
    MatIconModule,
    MatToolbarModule
  ]
})
class AngularModule { }

@NgModule({
  declarations: [
    AboutComponent,
  ],
  imports: [
    AngularModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AboutModule { }