import { FormField } from '../events/entities.events.forms'
import { FieldConstraintKey, FormFieldEntry } from './entities.observations'

export interface SimpleFieldValidationResult<Failed, Success> {
  failedBecauseTheEntry(reason: string, constraint?: FieldConstraintKey): Failed
  succeeded(parsed?: FormFieldEntry): Success
}

export interface SimpleFieldValidation {
  <Failed, Success>(field: FormField, entry: FormFieldEntry, result: SimpleFieldValidationResult<Failed, Success>): Failed | Success
}

export * as attachment from './entities.observations.fields.attachment'
export * as checkbox from './entities.observations.fields.checkbox'
export * as date from './entities.observations.fields.date'
export * as email from './entities.observations.fields.email'
export * as geometry from './entities.observations.fields.geometry'
export * as multiselect from './entities.observations.fields.multiselect'
export * as numeric from './entities.observations.fields.numeric'
export * as required from './entities.observations.fields.required'
export * as select from './entities.observations.fields.select'
export * as text from './entities.observations.fields.text'