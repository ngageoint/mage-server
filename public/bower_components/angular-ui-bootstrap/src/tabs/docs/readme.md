AngularJS version of the tabs directive.

### Settings ###

#### `<tabset>` ####

 * `vertical`
 	_(Defaults: false)_ :
 	Whether tabs appear vertically stacked.

 * `type`
 	_(Defaults: 'tabs')_ :
 	Navigation type. Possible values are 'tabs' and 'pills'.

 * `direction`
 	_(Defaults: null)_ :
 	What direction the tabs should be rendered. Available: 'right', 'left', 'below'.

#### `<tab>` ####

 * `heading` or `<tab-heading>`
 	:
 	Heading text or HTML markup.

 * `active` <i cl***REMOVED***="icon-eye-open"></i>
 	_(Defaults: false)_ :
 	Whether tab is currently selected.

 * `disabled` <i cl***REMOVED***="icon-eye-open"></i>
 	_(Defaults: false)_ :
 	Whether tab is clickable and can be activated.

 * `select()`
 	_(Defaults: null)_ :
 	An optional expression called when tab is activated.