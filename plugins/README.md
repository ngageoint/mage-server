# MAGE Plugins

The MAGE server supports plugins for both the service and the web app.  Both components define hooks which plugin
packages can use to extend functionality.

## Service plugins

Service plugins can extend the capabilities the MAGE service by adding integrations with external services or
manipulating data in the MAGE database itself in some useful way.  The [Image](./image/) plugin, for example, queries
the MAGE database for image attachments, rotates them such that they correctly oriented with respect to EXIF meta-data,
and generates smaller thumbnail versions of the photos so clients do not need to download full-size images unless
the users requests them.  The [NGA-MSI](./nga-msi/) plugin adds an integration with NGA's Maritime Safety Information
(MSI) web service to provide geospatial feeds of MSI data directly to MAGE clients.

### Hooks

The MAGE service defines several plugin [hook APIs](../service/src/plugins.api/).  A service plugin starts with the
aptly-named [`InitPluginHook`](../service/src/plugins.api/index.ts).  Any service plugin must at least implement an
init hook for the main service module to initialize the plugin.  The init hook defines dependencies on core service
components and performs any initialization tasks the plugin requires, such as database setup.  Any Node module can be
a plugin, as long as the module's export is an object conforming to the `InitPluginHook` type.  For example,
```typescript
export = {
  inject: {
    mageEventRepository: MageEventRepositoryToken
  },
  async init({ mageEventRepository: MageEventRepository }): Promise<any> {
    // initialize the plugin ...
  }
}
```
To inform the MAGE service that a given module is a plugin, you must list the module in the configuration you pass to
the [`mage.service`](../service/bin/mage.service.js) script.  For example, you could create a package called
`@examples/mage-plugins`.  Within the package you can export an `InitPluginHook` object from the root `index.js` module,
or you could export the hook object from a nested module such as `/plugin1`, or both.  For the MAGE service to register
those plugin hooks, you would start the service with switches like
```bash
npx mage.service --plugin @examples/mage-plugins
# or
npx mage.service --plugin @examples/mage-plugins/plugin1
# or
npx mage.service --plugin @examples/mage-plugins --plugin @examples/mage-plugins/plugin1
```

For a relatively robust example of dependency injection and initialization, see the [Image plugin's](./image/service/src/index.ts)
init hook, which injects a plugin-scoped repository to persist plugin configuration, and integrates with the MAGE
service's web layer to add plugin web routes.

### Dependency injection

As mentioned above, a plugin's init hook defines dependencies on core service components, such as repositories that
can interact with the database.  During startup, the [main service module](../service/src/app.ts) injects the
dependencies the plugin requests.  The object a plugin module exports can include an `inject` key whose value is
another object hash whose values are injection token symbols the MAGE service defines.  When present, the MAGE service
inspects a plugin's `inject` object and passes an object to the plugin's `init` function with the same keys as the
`inject` object whose values are the components corresponding to the injection token values.  For example, if a plugin
module exports the following init hook
```typescript
export = {
  inject: {
    eventRepo: MageEventRepositoryToken,
    observationRepoForEvent: ObservationRepositoryToken,
    userRepo: UserRepositoryToken
  },
  async init(injection): Promise<any> {
    // initialize the plugin ...
  }
}
```
... the `injection` argument the MAGE service passes to the `init` function will be an object with the shape
```typescript
{
  eventRepo: instanceOfMageEventRepository,
  observationRepoForEvent: instanceOfObservationRepositoryFactory,
  userRepo: instanceOfUserRepository
}
```
This dependency injection token concept is based on [Angular's](https://angular.io/guide/dependency-injection-overview)
mechanism.

### Creating a service plugin

A service plugin is a Node module contained within an NPM package.  To begin developing a plugin, create a new NPM
package.
```bash
mkdir mage-service-plugins
cd mage-service-plugins
npm init --scope @examples
```
Follow the prompts to finish initializing your package.

Manually edit the `package.json` file to include a peer dependency on `@ngageoint/mage.service` at your chosen version.
```json
  "peerDependencies": {
    "@ngageoint/mage.service": "^6.2.0"
  }
```

Then, add the MAGE service package to your plugin package.  The easiest way is to globally install a release package
tarball from [GitHub](https://github.com/ngageoint/mage-server/releases).
```bash
npm i -g https://github.com/ngageoint/mage-server/releases/download/6.2.0/ngageoint-mage.service-6.2.0.tgz
npm link @ngageoint/mage.service
```
This installs the package tarball from the given GitHub release URL under NPM's global prefix on you system, then links
the package from the global prefix location to your plugin package's `node_modules` directory to satisfy the peer
dependency on `@ngageoint/mage.service`.  Now, you should get clean output from `npm ls`.
```bash
$ npm ls
@examples/mage-service-plugins@1.0.0 <...>/mage/examples/mage-service-plugins
└── @ngageoint/mage.service@6.2.0 -> ./../../../../.nvm/versions/node/v16.15.1/lib/node_modules/@ngageoint/mage.service
```

Now, add TypeScript to take advantage type checking and code completion from the MAGE service types.  Ideally you'll
install the same version as the MAGE service's dependency to ensure compatibility with MAGE's .
```bash
npm i --save-dev typescript@^4.6.0
```
Then you add a [`tsconfig.json`](https://www.typescriptlang.org/tsconfig) to configure TypeScript.  You can use
TypeScript's `tsc` command to generate the file.
```bash
npx tsc --init
```
Alternatively, you can copy the configuration from one of the MAGE server [plugin](./nga-msi/tsconfig.json)
[packages](./image/service/tsconfig.json).  Adjust the TypeScript configuration to your liking, but generally you may
find that placing your `.ts` source files into a `src` directory, and outputting transpiled JavaScript to a separate
directory like `lib` or `dist` is a manageable arrangement.  This is what the TypeScript configurations for the MAGE
service and open source plugins specify.

Finally, you can start writing the code for your plugin.  Begin with a module file that exports the main
`InitPluginHook`.  This will likely be the [main module](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#main)
of your plugin package.  If you configured TypeScript to transpile from the `src` directory and output to the `lib`
directory as described above, create the file `src/index.ts`, and add the entry ``"main": "lib/index.js"` to
`package.json`.  In `src/index.ts`, add the following.
```typescript
export = {
  inject: {
  },
  async init(injection): Promise<any> {
  }
}
```
Then you can fill in the functionality of your plugin.

### Deploying a service plugin

#### Create the plugin package

To get your plugin running in a MAGE server, you'll first need a [running instance](../README.md#running-a-mage-server).
Once you've setup a server instance, you can package your plugin to add to the server instance.  If you used TypeScript
to code your plugin as described above, your plugin should transpile JavaScript to a directory, such as `lib`.  Ensure
your plugin's `package.json` defines the plugin's entry point using the `main` entry as above.  You could also use
[package exports](https://nodejs.org/api/packages.html#package-entry-points).  Also ensure that the `package.json`
[includes](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#files) all of the transpiled JavaScript by adding
an entry such as
```json
"files": [
  "lib"
]
```
Now, from the base directory of your plugin package, run the [`npm pack`](https://docs.npmjs.com/cli/v8/commands/npm-pack)
command to create a package tarball of your plugin.  This will create a file like `examples-mage-service-plugins-1.0.0.tgz`.
Copy the package tarball to a persistent location, like where you have [installed](../README.md#install-mage-server-packages)
the MAGE server packages.

#### Enable the plugin

To enable your plugin, add the ID of the module that exports your `PluginInitHook` to the `servicePlugins` array in your [configuration object](../README.md#configuration-merging).  You can do this a few ways.
1. Use the `--plugin` command line switch:
   ```bash
   mage.service --plugin @examples/mage-service-plugins
   ```
2. Use a plugin JSON object from a file:
   ```bash
   mage.service -P plugins.json
   ```
   where `plugins.json` contains
   ```json
   {
     "servicePlugins": [
       "@examples/mage-service-plugins"
     ]
   }
   ```
3. Use a full MAGE configuration object that references the plugin that exports the full configuration object:
   ```bash
   mage.service -C /etc/mage.js
   ```
   where `mage.json` contains something like
   ```javascript
   module.exports = {
     mage: {
       // other config options
       plugins: {
         servicePlugins: [
           '@examples/mage-service-plugins'
         ]
       }
     }
   }
   ```
4. Use an environment variable:
   ```bash
   MAGE_PLUGINS='{ "servicePlugins": [ "@examples/mage-service-plugins" ] }' mage.service
   ```

#### Multiple package plugins

You can provide multiple `PluginInitHook` modules in one package if you wish.  To enable them, include the ID of each
module that exports a `PluginInitHook` in the `servicePlugins` array:
```bash
mage.service --plugin @examples/mage-service-plugins/plugin1 --plugin @examples/mage-service-plugins/plugin2 # ...
```
or with plugins JSON file such as `mage.service -P plugins.json`:
```json
{
  "servicePlugins": [
    "@examples/mage-service-plugins/plugin1",
    "@examples/mage-service-plugins/plugin2"
  ]
}
```
Be sure that the module IDs you list are [resolvable](https://nodejs.org/api/modules.html#all-together) through your
package structure.  If your plugin package code resides in the `lib` directory and the `package.json` only has a `main`
entry, such as
```json
{
  "main": "lib/index.js"
}
```
then the registered plugin module IDs will need to include your package's top-level directory:
```json
{
  "servicePlugins": [
    "@examples/mage-service-plugins/lib/plugin1",
    "@examples/mage-service-plugins/lib/plugin2"
  ]
}
```
If your `package.json` includes your plugin modules as [entry points](https://nodejs.org/api/packages.html#package-entry-points)
in the `exports` entry, as below, then you will not need to include the top-level directory in the module IDs.  Be sure
to also include an entry point to allow the MAGE service to load the `package.json` file from your plugin package.
```json
{
  "exports": {
    ".": "./lib/index.js",
    "./plugin1.js": "./lib/plugin1.js",
    "./plugin2.js": "./lib/plugin2.js",
    "./package.json": "./package.json"
  }
}
```

## Web UI plugins

More to come soon.