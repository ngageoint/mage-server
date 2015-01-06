`$modal` is a s ***REMOVED*** to quickly create AngularJS-powered modal windows.
Creating custom modals is straightforward: create a partial view, its controller and reference them when using the ***REMOVED***.

The `$modal` ***REMOVED*** has only one method: `open(options)` where available options are like follows:

* `templateUrl` - a path to a template representing modal's content
* `scope` - a scope instance to be used for the modal's content (actually the `$modal` ***REMOVED*** is going to create a child scope of a a provided scope). Defaults to `$rootScope`
* `controller` - a controller for a modal instance - it can initialize scope used by modal. A controller can be injected with `$modalInstance`
* `resolve` - members that will be resolved and p***REMOVED***ed to the controller as locals; it is equivalent of the `resolve` property for AngularJS routes
* `backdrop` - controls presence of a backdrop. Allowed values: true (default), false (no backdrop), `'static'` - backdrop is present but modal window is not closed when clicking outside of the modal window.
* `keyboard` - indicates whether the dialog should be closable by hitting the ESC key, defaults to true
* `windowCl***REMOVED***` - additional CSS cl***REMOVED***(es) to be added to a modal window template

The `open` method returns a modal instance, an object with the following properties:

* `close(result)` - a method that can be used to close a modal, p***REMOVED***ing a result
* `dismiss(reason)` - a method that can be used to dismiss a modal, p***REMOVED***ing a reason
* `result` - a promise that is resolved when a modal is closed and rejected when a modal is dismissed
* `opened` - a promise that is resolved when a modal gets opened after downloading content's template and resolving all variables

In addition the scope ***REMOVED***ociated with modal's content is augmented with 2 methods:
* `$close(result)`
* `$dismiss(reason)`
Those methods make it easy to close a modal window without a need to create a dedicated controller