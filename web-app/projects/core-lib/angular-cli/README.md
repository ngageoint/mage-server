# Angular CLI Integration

This subfolder of modules contains Angular CLI integrations, including a [schematic]() and
[builder](), that facilitates creating MAGE web plugin bundles.

## Background
Before Angular 13, the Angular [Library](https://angular.dev/tools/libraries/creating-libraries) CLI tools and
[Angular Package Format](https://docs.google.com/document/d/1CZC2rcpxffTDfRDs6p1cfbmKNLA6x5O-NtkJglDaBVs/preview#heading=h.k0mh3o8u5hx)
produced a [UMD](https://github.com/umdjs/umd) bundle by default.  The UMD bundle was suitable to include in a plugin's
NPM package and for the core web app to download directly and load with [SystemJS](https://github.com/systemjs/systemjs)
at runtime to hook the plugin module into the web app.  Angular 13, however, eliminated the UMD bundle output from the
[Angular Package Format](https://angular.dev/tools/libraries/angular-package-format) leaving only ECMAScript Module
(ESM) outputs, as opposed to a concatenated, resolved bundle.  Angular's intention is that libraries are strictly a
development time construct, with the hosting application left to resolving, bundling, and tree-shaking the library's
`import` statements.  MAGE, however, is using Angular libraries differently, creating a bundle that excludes shared
dependencies the host web app provides, but including dependencies specific to the library, such that the host web app
can load the library as one chunk dynamically at runtime.  While native ESM could be a possibility for MAGE in the
future, a significant amount of evaluation and testing is necessary, and at minimum MAGE would require all instances to
run on HTTP/2 to maximize performance.  The major issue would be all the transactions required to load the large number
of module entry points that MAGE, Angular, Angular Material, and others comprise.  Whereas a conventional web app can
provide all the shared entry points by bare module specifier to SystemJS's named registry from a single bundle
downloaded initially, an ESM app must download each module separately on-demand as the JS engine processes `import`
statements.  Even with HTTP/2 multiplexing, this could be a serious performance hit.

## Plugin Library Schematic

## AMD Builder

## TODO

