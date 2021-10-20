import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialDesignFrameworkModule } from '@ajsf/material';
import { JsonSchemaFormWithServiceComponent } from './json-schema.component';

@NgModule({
  declarations: [
    JsonSchemaFormWithServiceComponent
  ],
  imports: [
    CommonModule,
    MaterialDesignFrameworkModule
  ],
  exports: [
    JsonSchemaFormWithServiceComponent
  ]
})
export class JsonSchemaModule { }
