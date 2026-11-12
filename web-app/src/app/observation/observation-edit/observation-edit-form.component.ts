import { Component, effect, EventEmitter, input, Output, signal } from '@angular/core'
import { UntypedFormGroup } from '@angular/forms'
import { FormPreference } from 'core-lib-src/user'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { GeometryModule } from '../../geometry/geometry.module'
import { ObservationEditAttachmentComponent } from './observation-edit-attachment/observation-edit-attachment.component'
import { ObservationEditCheckboxComponent } from './observation-edit-checkbox/observation-edit-checkbox.component'
import { ObservationEditDateComponent } from './observation-edit-date/observation-edit-date.component'
import { ObservationEditSelectComponent } from './observation-edit-select/observation-edit-select.component'
import { ObservationEditMultiselectComponent } from './observation-edit-multiselect/observation-edit-multiselect.component'
import { ObservationEditEmailComponent } from './observation-edit-email/observation-edit-email.component'
import { ObservationEditNumberComponent } from './observation-edit-number/observation-edit-number.component'
import { ObservationEditRadioComponent } from './observation-edit-radio/observation-edit-radio.component'
import { ObservationEditTextComponent } from './observation-edit-text/observation-edit-text.component'
import { ObservationEditTextareaComponent } from './observation-edit-textarea/observation-edit-textarea.component'
import { ObservationEditPasswordComponent } from './observation-edit-password/observation-edit-password.component'
import { GeometryEditEvent, ObservationEditGeometryComponent } from './observation-edit-geometry/observation-edit-geometry.component'
import { activeFormFields, Form, FormField } from '../../entities/event/entities.event'

@Component({
    selector: 'observation-edit-form',
    templateUrl: './observation-edit-form.component.html',
    styleUrls: ['./observation-edit-form.component.scss'],
    imports: [
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatIconModule,
        GeometryModule,
        ObservationEditAttachmentComponent,
        ObservationEditCheckboxComponent,
        ObservationEditDateComponent,
        ObservationEditSelectComponent,
        ObservationEditMultiselectComponent,
        ObservationEditEmailComponent,
        ObservationEditNumberComponent,
        ObservationEditRadioComponent,
        ObservationEditTextComponent,
        ObservationEditTextareaComponent,
        ObservationEditPasswordComponent,
        ObservationEditGeometryComponent,
    ]
})
export class ObservationEditFormComponent {
  formGroup = input.required<UntypedFormGroup>()
  formPreferences = input<FormPreference>()
  definition = input.required<Form>()
  geometryStyle = input<any>()
  attachmentUrl = input<string>()
  observation = input<any>()
  deletable = input(true)
  options = input.required<{ expand: boolean, deletable: boolean }>()

  @Output() remove = new EventEmitter<UntypedFormGroup>()
  @Output() featureEdit = new EventEmitter<GeometryEditEvent>()

  fieldNames = signal<string[]>([])
  fieldDefinitions = signal<Record<string, FormField>>({})
  primaryField = signal<any>({})
  primaryFieldValue = signal<any>(undefined)
  secondaryField = signal<any>({})
  secondaryFieldValue = signal<any>(undefined)

  expand = signal(false)

  constructor() {
    effect(() => {
      const definition = this.definition()
      const formGroup = this.formGroup()

      this.expand.set(this.options().expand)

      this.fieldDefinitions.set(definition.fields.reduce<Record<string, FormField>>((map, field) => {
        map[field.name] = field
        return map
      }, {}))

      const controlNames = Object.keys(formGroup.controls)
      this.fieldNames.set(
        activeFormFields(definition.fields)
          .filter(field => controlNames.includes(field.name))
          .map(field => field.name)
      )

      this.updateView()
    })
  }

  onGeometryEdit(event: GeometryEditEvent): void {
    this.featureEdit.emit(event)
  }

  removeForm(): void {
    this.remove.emit(this.formGroup())
  }

  private updateView(): void {
    const definition = this.definition()

    if (definition.primaryFeedField) {
      this.primaryField.set(definition.fields.find(field => field.name === definition.primaryFeedField))
      this.primaryFieldValue.set(this.getValue(definition.primaryFeedField))
    }

    if (definition.secondaryFeedField) {
      this.secondaryField.set(definition.fields.find(field => field.name === definition.secondaryFeedField))
      this.secondaryFieldValue.set(this.getValue(definition.secondaryFeedField))
    }
  }

  private getValue(fieldName: string): any {
    return this.formGroup().get(fieldName)?.value
  }
}
