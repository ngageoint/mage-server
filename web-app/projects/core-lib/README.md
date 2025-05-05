# MAGE Web Core Lib

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 9.1.13.

## Dependency notes
This library depends on Angular's `library` [schematic](https://github.com/angular/angular-cli/tree/main/packages/schematics/angular/library),
as well as Angular's `ng-packagr` [builder](https://github.com/angular/angular-cli/tree/main/packages/angular_devkit/build_angular/src/builders/ng-packagr),
to generate a library project, and bundle the project, respectively.  This library's builder also directly invokes
`rollup` as the last step of the bundle process to generate an AMD module.

Ideally, this project would have peer dependencies on these packages to facilitate managing versions, while specifying
correlating `devDependencies` that reference the this root project's Angular-related dependencies.  This would allow
development of this DevKit library to use the appropriate Angular libraries already installed at the parent level.
Similarly, a consuming project that adds this library would have Angular libraries installed at the top level of the
workspace, which should satisfy this library's peer dependencies, or cause an error during NPM's install process if the
consuming project does not supply compatible Angular libraries.

There are some hangups with that strategy, though, as of version 14 of the Angular suite of packages.
1. One of MAGE's dependencies, `@ajsf/material`, requires `rxjs` `^7.0.0`, but `@angular-devkit/*` libraries pin `rxjs`
   to `6.6.7`, which causes TypeScript type conflicts at build time for this DevKit library.  There are presently
   some undesirable `any` casts to overcome the `rxjs` type conflicts.  This should be fixed after upgrading to the
   latest Angular, currently 17, whose `@angular-devkit/core` package pins `rxjs` to `7.8.1`.
1. This library tries to reference a dev dependency on `rollup` through `../node_modules/rollup`.  This relative path
   dependency triggers NPM to try to run `rollup`'s `prepare` script, which invokes a tool called `husky`, pulled from
   `rollup`'s `devDependencies`.  However, NPM does not install `devDependencies` of dependencies, so `husky` is absent
   and `npm install` in this DevKit project exits with error.  The workaround is to install `husky` as a dev dependency
   of this project, which is not really correct.

Perhaps a better strategy is to just install the dependencies DevKit needs at the top level to manage the Angular
family of dependencies in one place, as opposed to managing and reconciling those dependency versions between the
root and sub-packages manually or with a custom script.  NPM's workspaces feature may also facilitate shared dependency
management by hoisting common dependencies, but the [documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
does not mention that specifically.  Other resources [state](https://blog.faizahmed.in/npm-workspaces#heading-what-are-npm-workspaces)
NPM does in fact hoist common dependencies.

## Code scaffolding

Run `ng generate component component-name --project core-lib` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project core-lib`.
> Note: Don't forget to add `--project core-lib` or else it will be added to the default project in your `angular.json` file.

## Build

Run `ng build core-lib` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

After building your library with `ng build core-lib`, go to the dist folder `cd dist/core-lib` and run `npm publish`.

## Running unit tests

Run `ng test core-lib` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
