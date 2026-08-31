import { isArray, isBoolean, isNil, isNumber, isString } from 'lodash'
import moment from 'moment'
import { RE2JS } from 're2js'
import { FormField, FormFieldType } from '../events/entities.events.forms'
import { fieldValidation } from './entities.observations.fields.core'
import { validateGeometryFieldType } from './entities.observations.fields.geometry'
import {
  FieldConstraintKeys,
  FieldValidationResult,
  FormFieldEntry,
} from './entities.observations.types'

type FieldConstraintValidation = (entry: FormFieldEntry | undefined, field: FormField) => FieldValidationResult

function validateEach(...constraints: FieldConstraintValidation[]): FieldConstraintValidation {
  return (entry, field): FieldValidationResult => {
    const constraintResults = constraints.reduce((result, constraint) => {
      if (result.invalid || result.valid === 'resolved') {
        return result
      }
      const currentResult = constraint(result.normalizedEntry as FormFieldEntry, field)
      if (currentResult.invalid) {
        return currentResult
      }
      const nextEntry = currentResult.normalizedEntry !== undefined ? currentResult.normalizedEntry : result.normalizedEntry
      return {
        ...currentResult,
        // always propagate the normalized entry to the next constraint
        normalizedEntry: nextEntry
      }
    }, fieldValidation.passed(entry))
    return constraintResults.valid === 'pass' ?
      fieldValidation.resolved(constraintResults.normalizedEntry) :
      constraintResults
  }
}

/**
 * If `entry` is an empty value, i.e., `null`, `undefined`, or an empty string, and `field.required` is truthy,
 * validation fails.  Trim leading and trailing whitespace when `entry` is a `string` before checking for empty
 * string.  The trimmed string will be the normalized value of the result.
 *
 * If `entry` is an empty value and `field.required` is falsey, validation passes with a normalized entry of `null`.
 *
 * Otherwise, validation passes without normalizing the entry.
 */
function validateRequiredConstraint(entry: FormFieldEntry | undefined, field: FormField): FieldValidationResult {
  // TODO: trim `string` value?
  if (isString(entry)) {
    entry = entry.trim()
  }
  if (isNil(entry) || entry === '') {
    if (field.required) {
      return fieldValidation.failed('An entry is required.', FieldConstraintKeys.Required)
    }
    // no further validation for an optional, absent entry
    return fieldValidation.resolved(entry === undefined ? undefined : null)
  }
  return fieldValidation.passed(entry)
}

/**
 * Validate the entry using {@link validateRequiredConstraint}, but return the original, untrimmed entry if the entry
 * contains any characters other than white space.
 */
function validateRequiredUntrimmed(entry: FormFieldEntry | undefined, field: FormField): FieldValidationResult {
  const requiredResult = validateRequiredConstraint(entry, field)
  if (requiredResult.invalid || requiredResult.normalizedEntry === null) {
    return requiredResult
  }
  return {
    ...requiredResult,
    normalizedEntry: undefined
  }
}

function noopValidation(): FieldValidationResult {
  return fieldValidation.resolved()
}

export const validateFieldTypeConstraint: Record<FormFieldType, (entry: FormFieldEntry | undefined, field: FormField) => FieldValidationResult> = {
  [FormFieldType.Attachment]: noopValidation,
  [FormFieldType.CheckBox]: validateEach(validateRequiredConstraint, validateCheckboxFieldType),
  [FormFieldType.DateTime]: validateEach(validateRequiredConstraint, validateDateTimeFieldType),
  [FormFieldType.Text]: validateEach(validateRequiredConstraint, validateTextFieldType, validateMinConstraint, validateMaxConstraint, validatePatternConstraint),
  [FormFieldType.TextArea]: validateEach(validateRequiredConstraint, validateTextFieldType, validateMinConstraint, validateMaxConstraint),
  [FormFieldType.Password]: validateEach(validateRequiredUntrimmed, validateTextFieldType, validateMinConstraint, validateMaxConstraint),
  [FormFieldType.Dropdown]: validateEach(validateRequiredConstraint, validateTextFieldType, validateChoicesConstraint),
  [FormFieldType.Email]: validateEach(validateRequiredConstraint, validateEmailFieldType),
  [FormFieldType.Geometry]: validateEach(validateRequiredConstraint, validateGeometryFieldType),
  [FormFieldType.Hidden]: noopValidation,
  [FormFieldType.MultiSelectDropdown]: validateEach(validateRequiredConstraint, validateMultiSelectFieldType, validateChoicesConstraint),
  [FormFieldType.Numeric]: validateEach(validateRequiredConstraint, validateNumericFieldType, validateMinConstraint, validateMaxConstraint),
  [FormFieldType.Radio]: validateEach(validateRequiredConstraint, validateChoicesConstraint),
}

function validateCheckboxFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  return isBoolean(entry) ? fieldValidation.passed() :
    fieldValidation.failed('The entry must be true or false.', FieldConstraintKeys.Value)
}

function validateDateTimeFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  if (isString(entry) || entry instanceof Date) {
    const date = moment(entry, moment.ISO_8601, true)
    if (date.isValid()) {
      return fieldValidation.passed(date.toDate())
    }
  }
  return fieldValidation.failed(
    `The entry must be an ISO-8601 date, e.g., ${new Date().toISOString()}.`, FieldConstraintKeys.Value)
}

function validateTextFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  if (!isString(entry)) {
    return fieldValidation.failed('The entry must be a string.', FieldConstraintKeys.Value)
  }
  return fieldValidation.passed()
}

function validateNumericFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  if (!isNumber(entry)) {
    return fieldValidation.failed('The entry must be a number.', FieldConstraintKeys.Value)
  }
  return fieldValidation.passed()
}

const emailRegex = /^[^\s@]+@[^\s@]+\./

function validateEmailFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  if (isString(entry) && emailRegex.test(entry)) {
    return fieldValidation.passed()
  }
  return fieldValidation.failed('The entry is not a valid email address.', FieldConstraintKeys.Value)
}

function validateMultiSelectFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  if (!isArray(entry)) {
    return fieldValidation.failed('The entry is not an array.', FieldConstraintKeys.Value)
  }
  if (entry.some(item => !isString(item))) {
    return fieldValidation.failed('The entry contains non-string elements.', FieldConstraintKeys.Value)
  }
  return fieldValidation.passed()
}

function validateMinConstraint(entry: FormFieldEntry | undefined, field: FormField): FieldValidationResult {
  if (!isNumber(field.min)) {
    return fieldValidation.passed()
  }
  if (isNumber(entry)) {
    if (entry < field.min) {
      return fieldValidation.failed(`The entry must be greater than or equal to ${field.min}.`, FieldConstraintKeys.Min)
    }
  }
  else if (isString(entry)) {
    if (entry.length < field.min) {
      return fieldValidation.failed(
        `The entry must be at least ${field.min} ` + (field.min === 1 ? 'character long.' : 'characters long.'),
        FieldConstraintKeys.Min)
    }
  }
  return fieldValidation.passed()
}

function validateMaxConstraint(entry: FormFieldEntry | undefined, field: FormField): FieldValidationResult {
  if (!isNumber(field.max)) {
    return fieldValidation.passed()
  }
  if (isNumber(entry)) {
    if (entry > field.max) {
      return fieldValidation.failed(`The entry must be less than or equal to ${field.max}.`, FieldConstraintKeys.Max)
    }
  }
  else if (isString(entry)) {
    if (entry.length > field.max) {
      return fieldValidation.failed(
        `The entry can be at most ${field.max} ` + (field.max === 1 ? 'character long.' : 'characters long.'),
        FieldConstraintKeys.Max)
    }
  }
  return fieldValidation.passed()
}

function validatePatternConstraint(entry: FormFieldEntry | undefined, field: FormField): FieldValidationResult {
  if (!field.pattern || !isString(field.pattern?.spec)) {
    return fieldValidation.passed()
  }
  if (!isString(entry)) {
    return fieldValidation.failed('The entry must be a string.', FieldConstraintKeys.Value)
  }
  // TODO: make case sensitivity optional on field definition?
  const pattern = RE2JS.compile(field.pattern.spec, RE2JS.CASE_INSENSITIVE)
  if (pattern.test(entry)) {
    return fieldValidation.passed()
  }
  return fieldValidation.failed(field.pattern.description || 'The entry does not match the field pattern.', FieldConstraintKeys.Pattern)
}

function validateChoicesConstraint(entry: FormFieldEntry | undefined, field: FormField): FieldValidationResult {
  const entryItems = isArray(entry) ? entry : [entry]
  const choices = (field.choices || [])
  const isValidChoice = choices.reduce((choices, choice) => {
    choices[choice.title] = true
    return choices
  }, {} as { [Choice: string]: true })
  const invalid = entryItems.some(item => !isString(item) || !isValidChoice[item])
  if (invalid) {
    return fieldValidation.failed('The entry is not in the set of valid choices.', FieldConstraintKeys.Choices)
  }
  return fieldValidation.passed()
}
