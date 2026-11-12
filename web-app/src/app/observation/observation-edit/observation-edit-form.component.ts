import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { UntypedFormGroup } from '@angular/forms'
import { FormPreference } from 'core-lib-src/user'
import { GeometryEditEvent } from './observation-edit-geometry/observation-edit-geometry.component'
import { activeFormFields, Form, FormField } from '../../entities/event/entities.event'

@Component({
    selector: 'observation-edit-form',
    templateUrl: './observation-edit-form.component.html',
    styleUrls: ['./observation-edit-form.component.scss'],
    standalone: false
})
export class ObservationEditFormComponent implements OnInit {
  @Input() formGroup: UntypedFormGroup
  @Input() formPreferences: FormPreference
  @Input() definition: Form
  @Input() geometryStyle: any
  @Input() attachmentUrl: string
  @Input() observation: any
  @Input() deletable = true
  @Input() options: { expand: boolean, deletable: boolean }

  @Output() remove = new EventEmitter<UntypedFormGroup>()
  @Output() featureEdit = new EventEmitter<GeometryEditEvent>()

  fieldNames: string[]
  fieldDefinitions: Record<string, FormField>
  primaryField: any = {}
  primaryFieldValue: any
  secondaryField: any = {}
  secondaryFieldValue: any

  expand: boolean

  ngOnInit(): void {
    this.expand = this.options.expand;

    this.fieldDefinitions = this.definition.fields.reduce<Record<string, FormField>>((map, field) => {
      map[field.name] = field
      return map
    }, {})

    const controlNames = Object.keys(this.formGroup.controls)
    this.fieldNames = activeFormFields(this.definition.fields)
      .filter(field => controlNames.includes(field.name))
      .map(field => field.name)

    this.updateView()
  }

  onGeometryEdit(event: GeometryEditEvent): void {
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
    return this.formGroup.get(fieldName)?.value
  }
}
