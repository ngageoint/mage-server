# Change Log

All notable changes to the ArcGIS plugin will be documented in this file.
The plugin adheres to [Semantic Versioning](http://semver.org/).

---

## [1.0.0-beta.4]
### Service
#### Features
* Looks up push status for each observation as it's sent to ArcGIS
* Added a "Reset Config" action that deletes the entire ArcGIS plugin configuration
#### Bug Fixes
* Fixed local `@ngageoint/mage.service` linking so `npm ci` works correctly when developing the plugin against the local source tree
* Improved handling of attribute field mappings to avoid collisions and errors

### Web App
#### Features
* Replaced the Events tab's per-event "edit layers/filter" popup with an inline expandable section
* Push Status table adds an "Attachments" column showing sent/failed counts per observation, with a hover tooltip listing each attachment's name and status
* New ability to browse a protal URL to lookup your feature service layer
* Field Mappings and Attributes now use constrained dropdowns instead of free-text entry for ArcGIS attribute names, with reserved-name warnings, to prevent typos and case mismatches between a field mapping and its attribute configuration
* Added a "Reset Config" button (Processing tab)
* General button and dialog styling pass for consistency
* UI usability improvements
#### Bug Fixes
* Fixed a change-detection bug where repeatedly interacting with an event's sync-after date/time filter could freeze the page
* Events list no longer shows stray dividers for events hidden by the filter box
