import { JsonSchemaFormService, JsonSchemaFormComponent } from '@ajsf/core';
import { Component } from '@angular/core';

/**
 * This wrapper components exists to workaround https://github.com/hamzahamidi/ajsf/issues/213.
 * The `JsonSchemaFormService` is stateful so multiple component instances
 * on one page cannot share the same service instance.  This wrapper serves
 * merely to _provide_ the service at the component level rather than the module
 * level so each component instance gets its own service instance.
 */
@Component({
  selector: 'mage-json-schema-form',
  providers: [ JsonSchemaFormService ],
  template: `
<form [autocomplete]="jsf?.formOptions?.autocomplete ? 'on' : 'off'" class="json-schema-form" (ngSubmit)="submitForm()">
  <root-widget [layout]="jsf?.layout"></root-widget>
</form>
<div *ngIf="debug || jsf?.formOptions?.debug">
  Debug output:
  <pre>{{debugOutput}}</pre>
</div>
`
})
export class JsonSchemaFormWithServiceComponent extends JsonSchemaFormComponent {}
