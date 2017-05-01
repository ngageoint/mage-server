# Change Log
All notable changes to this project will be documented in this file.
Adheres to [Semantic Versioning](http://semver.org/).

---
## 4.4.4 (TBD)

* TBD

##### Features

##### Bug Fixes
* Multi select checkbox for dropdowns fixed

## [4.4.3](https://github.com/ngageoint/mage-server/releases/tag/v4.4.3) (02-20-2017)

##### Features
* Admin can reorder select field options.
* Bulk user create.  From 'Users' admin page click the 'Bulk Import' button to import a csv of users.
* When deleting a team, you can now delete all users that are part of that team.

##### Bug Fixes

## [4.4.2](https://github.com/ngageoint/mage-server/releases/tag/v4.4.2) (01-27-2017)

##### Features

##### Bug Fixes
* Fixed issue with viewing already created form fields for an event

## [4.4.1](https://github.com/ngageoint/mage-server/releases/tag/v4.4.1) (01-26-2017)

##### Features

##### Bug Fixes
* Fix migrations module to work with mongodb SSL connection

## [4.4.0](https://github.com/ngageoint/mage-server/releases/tag/v4.4.0) (01-11-2017)

#### This release include database migrations.
* Please run `npm run migrate`

##### Features
* Added observations favorites.  Users can mark observations as a favorite, and can view other users favorites.
* Added important observations.  Users with event edit permissions can mark observations as important.
* Added observation share/export.  Share/export will package observation (including attachments) into a self contained html page.

##### Bug Fixes
* Changed default form type to textarea for textarea fields.  This will enable users to add new lines to default.

## [4.3.0](https://github.com/ngageoint/mage-server/releases/tag/v4.3.0) (09-22-2016)

##### Features
* Multi select support for dropdown and user dropdown fields.
* Don't allow ordering of type, timestamp, geometry or variantField from the form editor.  This will eliminate confusion
  since we always put those fields at the top of our clients.
* Update server configuration to allow for SSL communication between application and database.

##### Bug Fixes
* Added form import error handling on web client.
* Fixed feed layout height in Firefox.

## [4.2.1](https://github.com/ngageoint/mage-server/releases/tag/v4.2.1) (04-22-2016)
##### Features
* OSM geocoder added.  Search addresses from the MAGE map.  On successful search the map will pan an zoom to that location.

##### Bug Fixes
* Only allow ISO8601 times for observation timestamps.  Invalid time will result in a 400 response.
* Insert empty option for non required user fields in a form.  This will allow to to select no user, or clear a currently selected user.
* Map should no longer hang on invalid XYZ/TMS data sources.

## [4.2.0](https://github.com/ngageoint/mage-server/releases/tag/v4.2.0) (04-14-2016)
##### Features
* New numberfield in event form
* Rework observation/people feed to show map and feed on smaller devices
* Allow user to upload avatar when creating an account
* Read user permissions (web) to determine observation edit capabilities

##### Bug Fixes

## [4.1.1](https://github.com/ngageoint/mage-server/releases/tag/v4.1.1) (03-23-2016)
##### Features
* Added user agent and application version to device list on devices page.
* Maintain aspect ration for user avatars.

##### Bug Fixes
* User agent and application version now parsed and saved w/ device on login.
* Fixed flexbox layout issues for map popups in IE 11.
* Fixed observation edit not allowing save in some situations.

## [4.1.0](https://github.com/ngageoint/mage-server/releases/tag/v4.1.0) (03-17-2016)
##### Features
* 'Event Users' dropdown in form builder.  This dropdown is dynamically populated with all users in the event.
* Create your own user icon from the user edit page.
* Added environment module to support local and Cloud Foundry deployments.
* When creating a new MAGE server the initial user and device are now creating through the web interface, rather then by a database patch.
* Added some Excel specific fields to CSV export data.

##### Bug Fixes
* Fixed a bug where canceling an observation edit did not also clear attachment delete flag.  This made it look like the attachment may still have been deleted after clicking cancel.

## [4.0.1](https://github.com/ngageoint/mage-server/releases/tag/v4.0.1) (02-26-2016)

* You can now add users directly to an event
* Events can be marked as complete.  Complete events will not be returned for the default events route.

## [4.0.0](https://github.com/ngageoint/mage-server/releases/tag/v4.0.0) (02-03-2016)

* Google oauth support
