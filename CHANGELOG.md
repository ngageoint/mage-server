# Change Log
All notable changes to this project will be documented in this file.
MAGE adheres to [Semantic Versioning](http://semver.org/).

---
## Pending on [`develop`](https://github.com/ngageoint/mage-server/tree/develop)

##### Features

##### Bug Fixes

## [6.1.0](https://github.com/ngageoint/mage-server/releases/tag/6.1.0)

##### Features
* You can now enter and display all coordinates in the app in Degree Minute Second format.
* Administrators can now allow for any attachment types, or restrict to image, video or audio.

##### Bug Fixes
* Textarea in observation form is resizeable.
* User and team paging api update, fixes team and event size limitation. 

## [6.0.2](https://github.com/ngageoint/mage-server/releases/tag/6.0.2)

##### Features

##### Bug Fixes
* Fix observation view error on invalid primary/secondary feed field.
* Preserve primary and secondary feed fields on form import.
* Fix feed item preview, account for feed item without attachments.
* Fix form preview on event admin page.

## [6.0.1](https://github.com/ngageoint/mage-server/releases/tag/6.0.1)

##### Features
* Shapefile export has been removed, please use GeoPackage export.
* Updated all export formats to account for multiple observation forms.

##### Bug Fixes

## [6.0.0](https://github.com/ngageoint/mage-server/releases/tag/6.0.0)

### Release Notes
**This release includes database migrations, please remember to backup your database before upgrading.**

**If you are using geoaxis or google auth, you will need to login with a mage username/password account and follow the new setup in Adminstration options -> settings -> authentication.**

##### Features
* Multi form support. Users will be able to add multiple forms to an observation when the server configuration allows. Administrators can restrict total amount of forms, as well as min/max for individual forms.
* Attachments are now form fields.  All existing forms will be migrated to include and "Attachments" form field as the first first field in each form.  Administrators can edit forms to include any number of attachments fields.  In addition administrators can restrict the number of attachments allowed in each field as well as the types of attachments.
* Local user signup captcha.  All new local users will need to enter a captcha to create a local MAGE account.
* New authentication functionality ability under admin->settings (e.g. create, edit, etc.).
* Moving security settings to more secure location.
* Adding support for connecting to a generic OAuth server.
* Adding support for connecting to an OpenID Connect server.

##### Bug Fixes

## [5.5.2](https://github.com/ngageoint/mage-server/releases/tag/5.5.2)

##### Features

##### Bug Fixes
* GeoPackage export properly formats observation form data to allowed geopackage types.
* Fix invalid reference in export startup service.
* KML user location export properly groups user locations.

## [5.5.1](https://github.com/ngageoint/mage-server/releases/tag/5.5.1)

##### Features

##### Bug Fixes
* Fixed attachment upload regression when creating a new observation.
* Fixed user role not seeing observation details
* Fixed admin observation delete button missing

## [5.5.0](https://github.com/ngageoint/mage-server/releases/tag/5.5.0)

##### Features
* Export as GeoPackage.
* New export UI, allowing users to view previous exports.
* Exports are now done in the background, this will eliminate client timeouts for larger exports. 
* Minor performance enhancements to existing export types.
* Adding icons to search results on admin pages.

##### Bug Fixes
* Fix bug detecting invalid KML files on upload in some web clients.
* Login search on device page correctly filters on device.
* Display device uid, not user-agent, when filtering on devices from admin dashboard.
* Default admin approval as enabled for new user accounts.  This was causing new user account creation to fail.
* User map icon now appears on the map.  Default icon is also displayed instead of a missing icon image.
* Fixing grammar and misspellings on various admin pages.

## [5.4.4](https://github.com/ngageoint/mage-server/releases/tag/5.4.4)

##### Features
* Support for "Feature Style" extension, upgrade to newest version of GeoPackage JS.

##### Bug Fixes
* Change Graphics Magick call to orient image attachments such that exif metadata is not lost.
* Web should not prompt for device uid, if device admin approval is not enabled.
* Fix bug in 3rd party authentication which was not properly adding authenticated users.

## [5.4.3](https://github.com/ngageoint/mage-server/releases/tag/5.4.3)

#### Release Notes
* This release includes database migrations, please remember to backup your database before upgrading.

##### Features
* Optimize observation and user location responses.  Created new APIs to populate observation and location user information and removed individual calls to get users.
* Admins can now setup a more robust password policy, see Admin -> Settings -> Local Authentication.
* First 10 results are shown for controls using typeahead feature (e.g. logins, adding users to teams, etc.). 

##### Bug Fixes
* Multiple users can be added to a team and/or event without refreshing.
* Users and Teams can be removed from events.
* Removing a user from a team will no longer take you to the user page.
* Display names are shown when users are added to the ACL.
* Fix swagger authentication token injection.
* Observation export will no longer fail if attachment file is missing from file system.

## [5.4.2](https://github.com/ngageoint/mage-server/releases/tag/5.4.2)

##### Features

##### Bug Fixes
* Fix login after initial account setup.
* Fix export important, favorite and attachment filters.

## [5.4.1](https://github.com/ngageoint/mage-server/releases/tag/5.4.1)

##### Features
* Added observation location provider and location accuracy exports.

##### Bug Fixes
* Fixed bug causing observation and location exports to fail.
* Fixed incorrect timestamp when using local timezone for observation and location exports.
* Fixed bug causing incorrect locations to be returned when using time filter and exporting both observations and locations.

## [5.4.0](https://github.com/ngageoint/mage-server/releases/tag/5.4.0)

##### Features
* Added pagination for users, teams, events, devices and layers. This will greatly decrease load times for admin pages on servers with more users.
* Added observation location accuracy.
* Added support in configuration/environment for MongoDB replica sets.

##### Bug Fixes
* Layer panel now properly removes layers when switching events.
* Hide admin icon in navbar for non admin users.
* New users created by admin should default to 'active'.
* Docker build now works with Angular CLI
* Fixed swagger page.
* Date/Time fields honor required attribute on client.

## [5.3.5](https://github.com/ngageoint/mage-server/releases/tag/5.3.5)

##### Features
* Added administrative settings to enable automatic approval of new user accounts and devices.  If you are using a third party authentication strategy 
  where user accounts have already been vetted, you can reduce the barrier to entry into MAGE by using this setting to automatically approve user accounts. 
  In addition you can reduce the device admin approval barrier to entry by automatically approving all new devices.  Administrators can still
  disable devices for any reason, therby removing access to MAGE for that device. 
* Improved map layers panel.  Drag and drop layers to change map z-index, change layer opacity, zoom to layer bounds, and style feature layers.
* GeoPackage upgrade and optimizations.  Feature tiles are now created server side, reducing load on browser.
* Observation view/edit header is sticky and will not scroll with content.
* New Material Design Leaflet map buttons.
* LDAP authentication support.
* SAML authentication support.

##### Bug Fixes
* Add filter support to edit observation select and multiselect fields.
* Fix mobile web export.
* Fix observation download bug.
* Fix bug where unregistered devices were not shown on admin dashboard.
* Fix WMS layer getcapabilites fetch request when creating new WMS layer.
* Form create modal would sometimes generate an invalid random color.
* Fix bug that could cause iOS GeoPackage downloads to hang.
* Preserve line breaks and whitespace in textarea fields.

## [5.3.4](https://github.com/ngageoint/mage-server/releases/tag/5.3.4)

##### Features

##### Bug Fixes
* Fixed #70

## [5.3.3](https://github.com/ngageoint/mage-server/releases/tag/5.3.3)

##### Features
* Geometry edit moved to main map to provide more space to edit complex geometries while retaining the context of other user data on the map.
* Added export option to exclude observation attachments.

##### Bug Fixes
* Fixed bug parsing KML polygon and polyline styles.
* Improve error checking for invalid event form upload archives.
* Fix lag on observation delete.

## [5.3.2](https://github.com/ngageoint/mage-server/releases/tag/5.3.2)

##### Bug Fixes
* Bundle and host the Material Design CSS and fonts instead of pulling them
from the Google CDN so the MAGE webapp does not need an Internet connection.

## [5.3.1](https://github.com/ngageoint/mage-server/releases/tag/5.3.1)

##### Features
* Bulk user import UI rework.

##### Bug Fixes
* KML import file browser fixed.
* Update express default template renderer directory and remove pug specific rendering.
* Uploaded observation attachments preserve filename property after multer upgrade.

## [5.3.0](https://github.com/ngageoint/mage-server/releases/tag/5.3.0)

##### Features
* GeoServer plugin which creates OGC WMS/WFS endpoints from MAGE.
* Sort observation fields in CSV export in form order.
* Upgrade multer, file uploads are now configured per route.
* Display for the feed can now be configured per form
* Updated to use material design.
* Observation new and edit views moved outside of observation feed.
* Added user information view.
* New login and signup page flow!

##### Bug Fixes
* Fix KML to GeoJSON icon style.
* Export observations based on timestamp, not last updated.
* CSV export properly handles commas in values.
* Fix permission error when event user posts recent event.
* Fix bug preventing single observation download from web.
* Fix issue with form fields save marking form as dirty after save if it contains a user select field.

## [5.2.6](https://github.com/ngageoint/mage-server/releases/tag/5.2.6)

##### Features
* Increase JSON upload limit.
* Form import now supports historical forms.

##### Bug Fixes
* Select field option delete now removes correct option.
* Select field reorder now correctly highlights reordered field.
* Don't hide required asterisk on form field title if field has a value.
* Remove user token when user is disabled.
* Separated geoaxis authentication url from api url

## [5.2.5](https://github.com/ngageoint/mage-server/releases/tag/5.2.5)

##### Features
* Added Ubuntu upstart scripts

##### Bug Fixes
* Fix form preview in admin event page.
* Sort observation form fields in KML export.
* Catch 'disconnect' event on mage-image child process and shutdown.  This should prevent the mage-image process from being orphaned.

## [5.2.4](https://github.com/ngageoint/mage-server/releases/tag/5.2.4)

##### Features
* Added user create permission to EVENT_ADMIN_ROLE.

##### Bug Fixes
* Fix geometry view/edit field.
* Update file size metadata for uploaded GeoPackage after it is indexed.
* Add baseUrl to avatar and icon for team route when populating users.
* Upgrade GeoPackageJS libs to fix a problem creating vector tiles.

## [5.2.3](https://github.com/ngageoint/mage-server/releases/tag/5.2.3)

##### Features
* Added new environment variable and configuration to support secure login session cookie.  NOTE:
 the MAGE login session is a very short lived session that exists between valid authentication and
 device id authorization.

##### Bug Fixes
* Work around for leaflet GridLayer space between tiles.
* Fixed bug preventing navbar options from displaying all elements on mobile.

## [5.2.2](https://github.com/ngageoint/mage-server/releases/tag/5.2.2)

##### Features

##### Bug Fixes
* Fixed bug with date/time fields not saving.

## [5.2.1](https://github.com/ngageoint/mage-server/releases/tag/5.2.1)

##### Features
* New more featureful geocoder control

##### Bug Fixes
* Fix KML export for events with no forms.
* Fix bug in MGRS display for lines and polygons.
* Fix username/password error message on invalid login when account lock is disabled.
* Fix bug in observation edit where initial timezone format was not being picked up.
* Fix bug in shapefile column name that esri could not read.

## [5.2.0](https://github.com/ngageoint/mage-server/releases/tag/5.2.0)

##### Features
* Users can view or edit coordinates as MGRS.
* Users can edit observation time in GMT or Local time.
* Users can view observation and location time as relative or absolute local or GMT.
* Separate authentication from authorization.  Users will now be prompted to enter a device after after successful authentication.

##### Bug Fixes

## [5.1.4](https://github.com/ngageoint/mage-server/releases/tag/5.1.4)

##### Features
* Added GeoPackage layer support. Added server side XYZ urls to retrieve imagery from GeoPackages. The web client will use these URLs to display imagery tiles from a GeoPackage.  Added server side url to retrieve vector tiles from feature GeoPackages. The web client will use these to display vector tiles (with the aid of a leaflet plugin).
* User account lock settings.  Admins can now configure account lock/disable settings for local accounts.
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

## [5.1.3](https://github.com/ngageoint/mage-server/releases/tag/5.1.3)

##### Features

##### Bug Fixes
* Fixed secondary icon uploading for in event/form admin
* Don't allow EVENT_MANAGER_ROLE to change user roles
* Fix password strength meter on signup page
* Fix bug where confirmation modal does not disappear after deleting user
* Fix team filter on map page
* Initial save for banner/disclaimer settings fixed

## [5.1.2](https://github.com/ngageoint/mage-server/releases/tag/5.1.2)

##### Features
* mage-image plugin now uses mongo environment config.

##### Bug Fixes
* Fix a bug when non admin user queries for users or teams in an event.
* mage-image plugin now processes each attachment asynchronously.

## [5.1.1](https://github.com/ngageoint/mage-server/releases/tag/5.1.1)

##### Features
* Added init.d script for mage application

##### Bug Fixes
* Allow user with event access to update recent event
* Show default icon on web when creating an observation if no primary/secondary fields selected
* Add favicon in webpack build
* Don't show observation properties that are archived
* Don't submit observation properties that are archived

## [5.1.0](https://github.com/ngageoint/mage-server/releases/tag/5.1.0)

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

## [5.0.1](https://github.com/ngageoint/mage-server/releases/tag/5.0.1)

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

## [5.0.0](https://github.com/ngageoint/mage-server/releases/tag/5.0.0)

##### Features
* Support for multiple forms per event
* Linestring and polygon observation support
* Upgraded npm dependencies to latest.
* Added map icon color and map icon initials columns to bulk user import.
* Trim leading/trailing white space from username when creating users.

##### Bug Fixes

## [4.5.2](https://github.com/ngageoint/mage-server/releases/tag/4.5.2)

##### Features
* Event and Team access control lists.

##### Bug Fixes
* Base layers will never show on top of overlay layers.
* Last overlay layer clicked will be on top of other overlays.

## [4.5.1](https://github.com/ngageoint/mage-server/releases/tag/4.5.1)

##### Features
* Added createdAt timestamp for observations

##### Bug Fixes

## [4.5.0](https://github.com/ngageoint/mage-server/releases/tag/4.5.0)

##### Features
* New routes to create observations. POST to /id will now generate the observation location (the id of the observation)
  instead of the resource.  After getting a server generated location for an observation resource, clients are
  responsible for send the observation data as a PUT (idempotent). This will prevent duplicate observations
  if the client loses the response from the POST.

##### Bug Fixes
* Multi select checkbox for dropdowns fixed
* Fix a bug with observations duplicating on the map when changing favorite/important filter.

## [4.4.3](https://github.com/ngageoint/mage-server/releases/tag/4.4.3)

##### Features
* Admin can reorder select field options.
* Bulk user create.  From 'Users' admin page click the 'Bulk Import' button to import a csv of users.
* When deleting a team, you can now delete all users that are part of that team.

##### Bug Fixes

## [4.4.2](https://github.com/ngageoint/mage-server/releases/tag/4.4.2)

##### Features

##### Bug Fixes
* Fixed issue with viewing already created form fields for an event

## [4.4.1](https://github.com/ngageoint/mage-server/releases/tag/4.4.1)

##### Features

##### Bug Fixes
* Fix migrations module to work with mongodb SSL connection

## [4.4.0](https://github.com/ngageoint/mage-server/releases/tag/4.4.0)

#### This release include database migrations.
* Please run `npm run migrate`

##### Features
* Added observations favorites.  Users can mark observations as a favorite, and can view other users favorites.
* Added important observations.  Users with event edit permissions can mark observations as important.
* Added observation share/export.  Share/export will package observation (including attachments) into a self contained html page.

##### Bug Fixes
* Changed default form type to textarea for textarea fields.  This will enable users to add new lines to default.

## [4.3.0](https://github.com/ngageoint/mage-server/releases/tag/4.3.0)

##### Features
* Multi select support for dropdown and user dropdown fields.
* Don't allow ordering of type, timestamp, geometry or variantField from the form editor.  This will eliminate confusion
  since we always put those fields at the top of our clients.
* Update server configuration to allow for SSL communication between application and database.

##### Bug Fixes
* Added form import error handling on web client.
* Fixed feed layout height in Firefox.

## [4.2.1](https://github.com/ngageoint/mage-server/releases/tag/4.2.1)
##### Features
* OSM geocoder added.  Search addresses from the MAGE map. On successful search the map will pan an zoom to that location.

##### Bug Fixes
* Only allow ISO8601 times for observation timestamps.  Invalid time will result in a 400 response.
* Insert empty option for non required user fields in a form.  This will allow to to select no user, or clear a currently selected user.
* Map should no longer hang on invalid XYZ/TMS data sources.

## [4.2.0](https://github.com/ngageoint/mage-server/releases/tag/4.2.0)
##### Features
* New numberfield in event form
* Rework observation/people feed to show map and feed on smaller devices
* Allow user to upload avatar when creating an account
* Read user permissions (web) to determine observation edit capabilities

##### Bug Fixes

## [4.1.1](https://github.com/ngageoint/mage-server/releases/tag/4.1.1)
##### Features
* Added user agent and application version to device list on devices page.
* Maintain aspect ration for user avatars.

##### Bug Fixes
* User agent and application version now parsed and saved w/ device on login.
* Fixed flexbox layout issues for map popups in IE 11.
* Fixed observation edit not allowing save in some situations.

## [4.1.0](https://github.com/ngageoint/mage-server/releases/tag/4.1.0)
##### Features
* 'Event Users' dropdown in form builder.  This dropdown is dynamically populated with all users in the event.
* Create your own user icon from the user edit page.
* Added environment module to support local and Cloud Foundry deployments.
* When creating a new MAGE server the initial user and device are now creating through the web interface, rather then by a database patch.
* Added some Excel specific fields to CSV export data.

##### Bug Fixes
* Fixed a bug where canceling an observation edit did not also clear attachment delete flag.  This made it look like the attachment may still have been deleted after clicking cancel.

## [4.0.1](https://github.com/ngageoint/mage-server/releases/tag/4.0.1)

* You can now add users directly to an event
* Events can be marked as complete.  Complete events will not be returned for the default events route.

## [4.0.0](https://github.com/ngageoint/mage-server/releases/tag/4.0.0)

* Google oauth support
