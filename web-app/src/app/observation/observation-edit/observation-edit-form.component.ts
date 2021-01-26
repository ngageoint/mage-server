import { animate, state, style, transition, trigger } from '@angular/animations'
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core'
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms'

@Component({
  selector: 'observation-edit-form',
  templateUrl: './observation-edit-form.component.html',
  styleUrls: ['./observation-edit-form.component.scss'],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('rotate', [
      state('true', style({ transform: 'rotate(180deg)' })),
      state('false', style({ transform: 'rotate(0)' })),
      transition('* <=> *', animate('300ms ease-out'))
    ])
  ]
})
export class ObservationEditFormComponent {
  @Input() formGroup: FormGroup
  // @Input() formDefinition: any
  @Input() geometryStyle: any
  @Input() options: { expand: boolean }

  @Output() remove = new EventEmitter<any>()
  @Output() featureEdit = new EventEmitter<any>()

  fieldGroup: FormArray
  definition: any
  primaryField: any = {}
  secondaryField: any = {}

  expand: boolean

  ngOnInit(): void {
    this.expand = this.options.expand;

    console.log('edit form init w/ group', this.formGroup)
    const formId = Object.keys(this.formGroup.controls)[0]
    this.fieldGroup = this.formGroup.get(formId) as FormArray
    this.definition = this.fieldGroup['definition']

    this.definition.fields
      .filter(field => !field.archived)
      .sort((a, b) => a.id - b.id)
      .forEach(field => {
        const fieldControl = new FormControl(field.value, field.required ? Validators.required : null)
        fieldControl['definition'] = field
        this.fieldGroup.push(fieldControl)
        // this.fieldGroup.addControl(field.name, fieldControl)
      })

    // this.definition = this.formGroup.get(formId).definition

    // this.formGroup.get(this.formGroup.controls[0]);

    // const fieldsGroup = new FormGroup({})
    // this.formDefinition.fields
    //   .filter(field => !field.archived)
    //   .forEach(field => {
    //     const control = new FormControl(field.value, field.required ? Validators.required : null)
    //     fieldsGroup.addControl(field.name, control)
    //   });

    // const formGroup = this.formGroup.get(this.formDefinition.id) as FormGroup
    // formGroup.addControl(this.formDefinition.id, formGroup)

    this.updateView()
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   this.updateView()
  // }
  
  nonArchivedFields(fields: any[]): any[] {
    return fields.filter(field => !field.archived).sort((a: any, b: any) => a.id - b.id );
  }

  fieldControls(): string[] {
    return Object.keys(this.fieldGroup.controls);
  }

  onGeometryEdit(event): void {
    this.featureEdit.emit(event)
  }

  onGeometryChanged($event: any, field: any): void {
    field.value = $event.feature ? $event.feature.geometry : null;
  }

  removeForm(): void {
    this.remove.emit(this.definition)
  }

  private updateView(): void {
    if (this.definition.primaryFeedField) {
      this.primaryField = this.definition.fields.find(field => field.name === this.definition.primaryFeedField)
    }

    if (this.definition.secondaryFeedField) {
      this.secondaryField = this.definition.fields.find(field => field.name === this.definition.secondaryFeedField)
    }
  }

}
