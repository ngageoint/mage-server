import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialDesignFrameworkModule } from '@ngageoint/vendor-ajsf-material';
import { JsonSchemaFormWithServiceComponent } from './json-schema.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialDesignFrameworkModule,
    JsonSchemaFormWithServiceComponent
  ],
  exports: [
    JsonSchemaFormWithServiceComponent
  ]
})
export class JsonSchemaModule { }