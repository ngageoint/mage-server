import { SimpleFieldValidation } from './entities.observations.fields'


export const SelectFormFieldValidation: SimpleFieldValidation = function SelectFormFieldValidation(field, fieldEntry, result) {
  if (!fieldEntry) {
    return result.succeeded()
  }
  const choices = field.choices || []
  const selected = choices.filter(choice => choice.title === fieldEntry)
  if (selected.length) {
    return result.succeeded()
  }
  // TODO: limit the size of this string when there are too many choices
  return result.failedBecauseTheEntry(`must be one of ${choices.map(choice => choice.title)}`)
}