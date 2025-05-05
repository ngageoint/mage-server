import { NgModule } from "@angular/core";
import { SwaggerComponent } from "./swagger.component";
import { RouterModule, Routes } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatToolbarModule } from "@angular/material/toolbar";

const routes: Routes = [{
  path: '',
  component: SwaggerComponent
}];

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule
  ]
})
class AngularModule { }

@NgModule({
  declarations: [
    SwaggerComponent
  ],
  imports: [
    AngularModule,
    RouterModule.forChild(routes)
  ],
  exports: [ RouterModule ]
})
export class SwaggerModule {
}