import { animate, state, style, transition, trigger } from '@angular/animations'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormGroup } from '@angular/forms'

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
  @Input() definition: any
  @Input() geometryStyle: any
  @Input() attachmentUrl: string
  @Input() observation: any
  @Input() deletable = true
  @Input() options: { expand: boolean, deletable: boolean }

  @Output() remove = new EventEmitter<FormGroup>()
  @Output() featureEdit = new EventEmitter<any>()

  fieldNames: string[]
  fieldDefinitions: {}
  primaryField: any = {}
  primaryFieldValue: any
  secondaryField: any = {}
  secondaryFieldValue: any

  expand: boolean

  ngOnInit(): void {
    this.expand = this.options.expand;

    this.fieldDefinitions = this.definition.fields.reduce((map, field) => {
      map[field.name] = field
      return map
    }, {})

    const controlNames = Object.keys(this.formGroup.controls)
    this.fieldNames = this.definition.fields
      .filter(field => !field.archived)
      .filter(field => controlNames.includes(field.name))
      .sort((a, b) => a.id - b.id)
      .map(field => field.name)

    this.updateView()
  }
  
  nonArchivedFields(fields: any[]): any[] {
    return fields.filter(field => !field.archived).sort((a: any, b: any) => a.id - b.id );
  }

  onGeometryEdit(event): void {
    this.featureEdit.emit(event)
  }

  removeForm(): void {
    this.remove.emit(this.formGroup)
  }

  private updateView(): void {
    if (this.definition.primaryFeedField) {
      this.primaryField = this.definition.fields.find(field => field.name === this.definition.primaryFeedField)
      this.primaryFieldValue = this.getValue(this.definition.primaryFeedField)
    }

    if (this.definition.secondaryFeedField) {
      this.secondaryField = this.definition.fields.find(field => field.name === this.definition.secondaryFeedField)
      this.secondaryFieldValue = this.getValue(this.definition.secondaryFeedField)
    }
  }

  private getValue(fieldName: string): any {
    return this.formGroup.get(fieldName).value
  }
}
