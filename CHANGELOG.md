# Change Log
All notable changes to this project will be documented in this file.
MAGE adheres to [Semantic Versioning](http://semver.org/).

---
## Pending on [`develop`](https://github.com/ngageoint/mage-server/tree/develop)

##### Features
* Added GeoPackage layer support. Added server side XYZ urls to retrieve imagery from GeoPackages. The web client will use these URLs to display imagery tiles from a GeoPackage.  Added server side url to retrieve vector tiles from feature GeoPackages. The web client will use these to display vector tiles (with the aid of a leaflet plugin).
* Replace local [environment](environment) NPM packages with a single Node module
** No more manually deleting the local module from the `node_modules` directory for script changes
* Load values from [environment variables](README.md#mage-environment-settings) instead of only from the script
** No more copying the modified environment script when [upgrading](README.md#upgrading-mage-server) the server
* Continuously attempt to connect to MongoDB when the server app starts, exiting after a [configured](environment/magerc.sh) timeout
* Automatically run [database migrations](README.md#mage-database-setup) when the server starts, after connecting to MongoDB successfully
* Do not accept HTTP client connections until the database connection is successful and all migrations have run
* Added a [`docker-compose`](docker/docker-compose.yml) file and [`Dockerfile`](docker/server/Dockerfile) to [run MAGE](docker/README.md) as a Docker app
* Added environment [support](environment/env.js) and [placeholders](environment/magerc.sh) configuration for MongoDB [x509 authentication](https://docs.mongodb.com/v3.6/core/security-x.509/) and 2-way [SSL](https://docs.mongodb.com/v3.6/tutorial/configure-ssl/) between MAGE Server and MongoDB

##### Bug Fixes
* Fixed secondary icon uploading for in event/form admin
* Show line breaks in disclaimer dialog.

## [5.1.3](https://github.com/ngageoint/mage-server/releases/tag/5.1.3) (05-28-2018)

##### Features

##### Bug Fixes
* Fixed secondary icon uploading for in event/form admin
* Don't allow EVENT_MANAGER_ROLE to change user roles
* Fix password strength meter on signup page
* Fix bug where confirmation modal does not disappear after deleting user
* Fix team filter on map page
* Initial save for banner/disclaimer settings fixed

## [5.1.2](https://github.com/ngageoint/mage-server/releases/tag/5.1.2) (04-20-2018)

##### Features
* mage-image plugin now uses mongo environment config.

##### Bug Fixes
* Fix a bug when non admin user queries for users or teams in an event.
* mage-image plugin now processes each attachment asynchronously.

## [5.1.1](https://github.com/ngageoint/mage-server/releases/tag/5.1.1) (04-12-2018)

##### Features
* Added init.d script for mage application

##### Bug Fixes
* Allow user with event access to update recent event
* Show default icon on web when creating an observation if no primary/secondary fields selected
* Add favicon in webpack build
* Don't show observation properties that are archived
* Don't submit observation properties that are archived

## [5.1.0](https://github.com/ngageoint/mage-server/releases/tag/5.1.0) (02-27-2018)

##### Features
* Upgraded min/max nodejs version 6/8.
* Upgraded web from bower/grunt to npm/webpack.
* Updated admin icons and styles to properly cascade defaults.
* Added route to get teams including users for a specific event. Clients should use this as a performance boost to get only users that are part of an event.

##### Bug Fixes
* Fix bug when trying to set form line/polygon style.
* Add line and polygon support for observation export from news feed.
* Handle historic form import for pre 5.x forms.  This will remove the timestamp and geometry fields from the imported form definition as
  those fields belong to the observation, not the form.

## [5.0.1](https://github.com/ngageoint/mage-server/releases/tag/5.0.1) (01-30-2018)

##### Features
* Added password strength meters to admin user password change and sign up page.

##### Bug Fixes
* Fix exporters (GeoJSON, KML, Shapefile, CSV) to work with multiple forms.
* Don't export archived fields.
* Fixed observation download to work with multiple forms.
* Changing the observation geometry type (point, line, polygon) in the middle of creating will not leave old shape on the map.
* Disable observation save while editing line and polygon until edit is complete.
* Fix race condition when loading devices and users in admin pages.
* Force reload devices and users every time a user goes to the admin page.
* Show required checkbox when editing historical 'type' fields.
* Fixed regex for password and password confirm match that was causing some like password to report a mismatch.
* Fixed a bug where new users password was checked against existing password, which of course didn't exist.
* Modify event projection query to contain acl and teamIds which allows for event CRUD permissions check.
* Don't allow event team to be removed from its event.

## [5.0.0](https://github.com/ngageoint/mage-server/releases/tag/5.0.0) (01-23-2018)

##### Features
* Support for multiple forms per event
* Linestring and polygon observation support
* Upgraded npm dependencies to latest.
* Added map icon color and map icon initials columns to bulk user import.
* Trim leading/trailing white space from username when creating users.

##### Bug Fixes

## [4.5.2](https://github.com/ngageoint/mage-server/releases/tag/4.5.2) (08-14-2017)

##### Features
* Event and Team access control lists.

##### Bug Fixes
* Base layers will never show on top of overlay layers.
* Last overlay layer clicked will be on top of other overlays.

## [4.5.1](https://github.com/ngageoint/mage-server/releases/tag/4.5.1) (07-11-2017)

##### Features
* Added createdAt timestamp for observations

##### Bug Fixes

## [4.5.0](https://github.com/ngageoint/mage-server/releases/tag/4.5.0) (05-26-2017)

##### Features
* New routes to create observations. POST to /id will now generate the observation location (the id of the observation)
  instead of the resource.  After getting a server generated location for an observation resource, clients are
  responsible for send the observation data as a PUT (idempotent). This will prevent duplicate observations
  if the client loses the response from the POST.

##### Bug Fixes
* Multi select checkbox for dropdowns fixed
* Fix a bug with observations duplicating on the map when changing favorite/important filter.

## [4.4.3](https://github.com/ngageoint/mage-server/releases/tag/4.4.3) (02-20-2017)

##### Features
* Admin can reorder select field options.
* Bulk user create.  From 'Users' admin page click the 'Bulk Import' button to import a csv of users.
* When deleting a team, you can now delete all users that are part of that team.

##### Bug Fixes

## [4.4.2](https://github.com/ngageoint/mage-server/releases/tag/4.4.2) (01-27-2017)

##### Features

##### Bug Fixes
* Fixed issue with viewing already created form fields for an event

## [4.4.1](https://github.com/ngageoint/mage-server/releases/tag/4.4.1) (01-26-2017)

##### Features

##### Bug Fixes
* Fix migrations module to work with mongodb SSL connection

## [4.4.0](https://github.com/ngageoint/mage-server/releases/tag/4.4.0) (01-11-2017)

#### This release include database migrations.
* Please run `npm run migrate`

##### Features
* Added observations favorites.  Users can mark observations as a favorite, and can view other users favorites.
* Added important observations.  Users with event edit permissions can mark observations as important.
* Added observation share/export.  Share/export will package observation (including attachments) into a self contained html page.

##### Bug Fixes
* Changed default form type to textarea for textarea fields.  This will enable users to add new lines to default.

## [4.3.0](https://github.com/ngageoint/mage-server/releases/tag/4.3.0) (09-22-2016)

##### Features
* Multi select support for dropdown and user dropdown fields.
* Don't allow ordering of type, timestamp, geometry or variantField from the form editor.  This will eliminate confusion
  since we always put those fields at the top of our clients.
* Update server configuration to allow for SSL communication between application and database.

##### Bug Fixes
* Added form import error handling on web client.
* Fixed feed layout height in Firefox.

## [4.2.1](https://github.com/ngageoint/mage-server/releases/tag/4.2.1) (04-22-2016)
##### Features
* OSM geocoder added.  Search addresses from the MAGE map.  On successful search the map will pan an zoom to that location.

##### Bug Fixes
* Only allow ISO8601 times for observation timestamps.  Invalid time will result in a 400 response.
* Insert empty option for non required user fields in a form.  This will allow to to select no user, or clear a currently selected user.
* Map should no longer hang on invalid XYZ/TMS data sources.

## [4.2.0](https://github.com/ngageoint/mage-server/releases/tag/4.2.0) (04-14-2016)
##### Features
* New numberfield in event form
* Rework observation/people feed to show map and feed on smaller devices
* Allow user to upload avatar when creating an account
* Read user permissions (web) to determine observation edit capabilities

##### Bug Fixes

## [4.1.1](https://github.com/ngageoint/mage-server/releases/tag/4.1.1) (03-23-2016)
##### Features
* Added user agent and application version to device list on devices page.
* Maintain aspect ration for user avatars.

##### Bug Fixes
* User agent and application version now parsed and saved w/ device on login.
* Fixed flexbox layout issues for map popups in IE 11.
* Fixed observation edit not allowing save in some situations.

## [4.1.0](https://github.com/ngageoint/mage-server/releases/tag/4.1.0) (03-17-2016)
##### Features
* 'Event Users' dropdown in form builder.  This dropdown is dynamically populated with all users in the event.
* Create your own user icon from the user edit page.
* Added environment module to support local and Cloud Foundry deployments.
* When creating a new MAGE server the initial user and device are now creating through the web interface, rather then by a database patch.
* Added some Excel specific fields to CSV export data.

##### Bug Fixes
* Fixed a bug where canceling an observation edit did not also clear attachment delete flag.  This made it look like the attachment may still have been deleted after clicking cancel.

## [4.0.1](https://github.com/ngageoint/mage-server/releases/tag/4.0.1) (02-26-2016)

* You can now add users directly to an event
* Events can be marked as complete.  Complete events will not be returned for the default events route.

## [4.0.0](https://github.com/ngageoint/mage-server/releases/tag/4.0.0) (02-03-2016)

* Google oauth support
