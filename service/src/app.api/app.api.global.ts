import { MageError, PermissionDeniedError } from './app.api.errors'
import { JsonObject } from '../entities/entities.json_types'
import { LanguageTag, Locale } from '../entities/entities.i18n'

export interface AppRequestContext<Principal = unknown> {
  /**
   * The request token is a value the adapter layer injects to track the
   * request.  This is necessary to achieve the same effect as a "thread-local"
   * variable that a Java application would use.  Node does not use the model
   * of one thread per request, so some unique value is necessary to track a
   * request context across multiple asynchronous operations.
   */
  readonly requestToken: unknown
  requestingPrincipal(): Principal
  /**
   * Return localization information associated with the request, such as the
   * language preference of the client.
   */
  locale(): Locale | null
}


export interface AppRequest<Principal = unknown, Context extends AppRequestContext<Principal> = AppRequestContext<Principal>>  {
  context: Context
}


/**
 * `Descriptor` is a simple interface that marks child interfaces as a
 * descriptor whose purpose is essentially a data transfer object that service
 * clients consume.  The interface provides one property, `descriptorOf`.
 * The `descriptorOf` property helps to identify the domain type the
 * descriptor represents.  This can be helpful because JSON documents may not
 * be immediately distinguishable in the wild.  Child interfaces should
 * override the property to be a constant string value, e.g.,
 * ```
 * interface UserDescriptor extends Descriptor {
 *   descriptorOf: 'mage.User',
 *   userName: string,
 *   // ... more user properties suitable for the client
 * }
 * ```
 */
export interface Descriptor<T extends string> extends JsonObject {
  descriptorOf: T
}

/**
 * This type simply maps a union of types only if the types extend from MageError.
 */
export type AnyMageError<KnownErrors> = KnownErrors extends MageError<infer Code, infer Data> ? MageError<Code, Data> : never

export class AppResponse<Success, KnownErrors> {

  static success<Success, KnownErrors>(result: Success, contentLanguage?: LanguageTag[] | null | undefined): AppResponse<Success, AnyMageError<KnownErrors>> {
    return new AppResponse<Success, AnyMageError<KnownErrors>>(result, null, contentLanguage)
  }

  static error<KnownErrors>(result: KnownErrors, contentLanguage?: LanguageTag[] | null | undefined): AppResponse<any, KnownErrors> {
    return new AppResponse<any, KnownErrors>(null, result, contentLanguage)
  }

  static resultOf<Success, KnownErrors>(promise: Promise<Success | AnyMageError<KnownErrors>>): Promise<AppResponse<Success, AnyMageError<KnownErrors>>> {
    return promise.then(
      successOrKnownError => {
        if (successOrKnownError instanceof MageError) {
          return AppResponse.error(successOrKnownError)
        }
        return AppResponse.success(successOrKnownError)
      })
  }

  private constructor(readonly success: Success | null, readonly error: KnownErrors | null, readonly contentLanguage?: LanguageTag[] | null | undefined) {}
}

/**
 * This type provides a shorthand to map the given operation type argument to
 * its known, checked errors that its Promise might resolve in an [AppResponse].
 */
export type KnownErrorsOf<T> = T extends (...args: any[]) => Promise<AppResponse<infer Success, infer KnownErrors>> ?
  Success extends MageError<any, any> ? never :
  KnownErrors extends MageError<any, any> ? KnownErrors :
  never : never

/**
 * Wait for the given permission check to resolve.  If the permission check
 * succeeds, perform the given operation and return the result as an
 * [AppResponse].  If the permission check fails, return an error [AppResponse]
 * with a [PermissionDeniedError]  This function provides a simple way to always
 * return the appropriate [AppResponse] an app operation requires.
 *
 * @param permissionCheck a Promise that resolves to a permission result
 * @param op the operation to perform if the permission check succeeds
 *
 * TODO: localization
 * permission check would localize its error message presumably
 */
export async function withPermission<Success, KnownErrors>(
  permissionCheck: Promise<PermissionDeniedError | null>,
  op: (...args: any[]) => Promise<Success | AnyMageError<KnownErrors>>): Promise<AppResponse<Success, AnyMageError<KnownErrors | PermissionDeniedError>>> {
  const denied = await permissionCheck
  if (denied) {
    return AppResponse.error<PermissionDeniedError>(denied)
  }
  return await AppResponse.resultOf<Success, KnownErrors>(op())
}
