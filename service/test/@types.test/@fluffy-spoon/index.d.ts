import { Argument } from '@fluffy-spoon/substitute/dist/src/Arguments'
import { AppRequest, AppRequestContext } from '../../../lib/app.api/app.api.global'

/**
 * For some reason, putting the declaration here in this specific folder is the
 * only configuration that satisfies ts-node.  The TypeScript compiler accepted
 * several variations, like
 * ```
 * declare module '@fluffy-spoon/substitute/dist/src/Arguments {
 *   namespace Arg {
 *     function deepEquals<T>(x: T): Argument<T> & T
 *   }
 * }
 * ```
 * in `index.d.ts` at the root of a `typeRoots` folder.  ts-node also requires
 * that this declaration exist under a `typeRoots` folder (see `tsconfig.json`)
 * in order to make the declaration global so all the test modules would not
 * have to import this augmented declaration explicitly, as in
 * `import '../../utils.ts'` in some test file.  When this declaration used to
 * be in the `utils.ts` file, the TypeScript compiler did not require test
 * files to import `utils.ts` explicitly for this declaration to be visible.
 * Clearly there are some differences in the way TypeScript's `tsc` compiler
 * and `ts-node` resolve types.
 */
declare module '@fluffy-spoon/substitute' {
  // use namespace to effectively merge a static function to an existing class
  namespace Arg {
    function deepEquals<T>(x: T): Argument<T> & T
    /**
     * Match if the actual argument's string value `==` the string value of the
     * given expected value.  The matcher computes strings by wrapping the
     * acutal and expected values with JavaScript's `String()` function.
     * @param expected
     */
    function sameStringValueAs<T>(expected: any): Argument<T> & T
    function requestTokenMatches<T extends AppRequest>(expectedRequest: T): Argument<T> & T
    function requestTokenMatches<T extends AppRequestContext>(expectedContext: T): Argument<T> & T
  }
}

