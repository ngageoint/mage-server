import { ZodError } from 'zod'
import { invalidInput, InvalidInputError, KeyPathError } from '../app.api/app.api.errors'

export function invalidInputErrorForZodError(zodErr: ZodError): InvalidInputError {
  const keyPathErrors = zodErr.issues.map<KeyPathError>(zodIssue => {
    const keyErr = zodIssue.message
    const keyPath = zodIssue.path.map(String)
    return [keyErr, ...keyPath]
  })
  return invalidInput(
    zodErr.message,
    ...keyPathErrors
  )
}
