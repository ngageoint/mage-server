import { SimpleFieldValidation } from './entities.observations.fields'


export const MultiSelectFormFieldValidation: SimpleFieldValidation = function MultiSelectFormFieldValidation(field, fieldEntry, result) {
  if (!fieldEntry) {
    return result.succeeded()
  }
  if (!Array.isArray(fieldEntry)) {
    return result.failedBecauseTheEntry('must be an array')
  }
  const choices = (field.choices || [])
  const isValidChoice = choices.reduce((choices, choice) => {
    choices[choice.title] = true
    return choices
  }, {} as { [Choice: string]: true })
  const invalid = fieldEntry.some(value => typeof value !== 'string' || !isValidChoice[value])
  if (invalid) {
    // TODO: maybe should limit the length of this string
    return result.failedBecauseTheEntry(`must be one of ${choices.map(choice => choice.title)}`)
  }
  return result.succeeded()
}