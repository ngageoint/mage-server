# Change Log
All notable changes to this project will be documented in this file.
Adheres to [Semantic Versioning](http://semver.org/).

---

## 4.1.1 (TBD)

* TBD
##### Features
* Added user agent and application version to device list on devices page.

##### Bug Fixes
* User agent and application version now parsed and saved w/ device on login.

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
