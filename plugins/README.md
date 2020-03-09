## MAGE Plugins

All plugins are seperate node scripts located in the plugins folder.  Each script is configured with the config.js file located in each specific plugins directory.

### Common config

All plugins are enable/disabled by the 'enable' flag in the configuration file.  If enabled, the plugin will run as a seperate node process

```json
{
  "enable": false,
  ...
}
```

### MAGE Image plugin

The mage-image plugin will ensure that all image attachments uploaded to the MAGE server are rotated.  It will also create thumbnails for each image attachment.  MAGE clients will try and pull smaller (thumbnail) attachments for certain views based on size and resolution. Turning this plugin on is optional and requires GraphicsMagick.  See here for [installing GraphicsMagick] (../README.md#graphicsmagick-setup)

Configuration:
* image
 * orient - flag to turn orientation on/off
 * thumbSizes - array of image thumbnail sizes to create.
 * interval - frequency (seconds) at which the plugin will check for new images to rotate.
* mongodb
 * url - url scheme for the mongodb database.  This should be the same mongodb schema as used in your main MAGE configuration.
 * poolSize - mongodb connection pool size for this plugin

```json
{
  "enable": false,
  "image": {
    "orient": true,
    "thumbSizes": [150, 320, 800, 1024, 2048],
    "interval": 60
  },
  "mongodb": {
	  "url": "mongodb://localhost/magedb",
	  "poolSize": 1
	}
}
```

### MAGE EPIC plugin

The mage-epic plugin will replicate MAGE observation to an ESRI server using [ESRI's REST API](http://resources.arcgis.com/en/help/rest/apiref/).

Configuration:

* esri - ESRI server configuration
  * url - ESRI url
      * host - ESRI root url
      * site - ESRI site partial url
      * restServices - ESRI rest services partial url
      * folder - ESRI folder partial url
      * serviceName - ESRI service name partial url
      * serviceType - ESRI service type partial url
      * layerId - ESRI layerId partial url
  * observations - MAGE observation mapping.  Add one for each event id (i.e. 7 maps MAGE fields from eventId 7)
      * enable - turn on/off sync'ing of this event
      * interval - frequency (seconds) at which the plugin will sync this event to the ESRI server.
      * fields - array that maps each observation field to an ESRI fields
          * type - primitive type
          * mage - obseravtion field name in MAGE
          * esri - ESRI field name
  * attachments
      * enable - turn on/off attachment sync'ing
      * interval - frequency (seconds) at which the plugin will sync attachments to the ESRI server.
* mongodb
  * url - url scheme for the mongodb database.  This should be the same mongodb schema as used in your main MAGE configuration.
  * poolSize - mongodb connection pool size for this plugin

```json
{
  "enable": false,
  "esri": {
    "url": {
      "host": "<root ERSI server>",
      "site": "<site partial>",
      "restServices": "<rest services partial>",
      "folder": "<folder partial>",
      "serviceName": "<service name partial>",
      "serviceType": "<service type partial>",
      "layerId": "<layer id partial>"
    },
  	"observations": {
      "7": {
    		"enable": true,
    		"interval": 30,
        "fields": [{
          "type": "Date",
          "mage": "timestamp",
          "esri": "EVENTDATE"
        },{
          "type": "Type",
          "mage": "type",
          "esri": "TYPE"
        },{
          "type": "String",
          "mage": "EVENTLEVEL",
          "esri": "EVENTLEVEL"
        },{
          "type": "String",
          "mage": "TEAM",
          "esri": "TEAM"
        },{
          "type": "String",
          "mage": "DESCRIPTION",
          "esri": "DESCRIPTION"
        }]
  	  }
    },
  	"attachments": {
  		"enable":true,
  		"interval": 60
    }
  },
  "mongodb": {
	  "url": "mongodb://localhost/magedb",
	  "poolSize": 1
	}
}
```

### MAGE RAGE plugin

The mage-rage plugin will replicate all MAGE data to another mage server

Configuration:

* url - MAGE server url to replicate data to.
* credentials - MAGE replication server credentials used for authentication.
 * username - username on MAGE replication server
 * uid - device uid
 * password - password
* interval - frequency (seconds) at which the plugin will sync data to the replication server.
* mongodb
 * url - url scheme for the mongodb database.  This should be the same mongodb schema as used in your main MAGE configuration.
 * poolSize - mongodb connection pool size for this plugin

```json
{
	"enable": false,
	"url": "",
	"credentials": {
		"username": "",
		"uid": "",
		"password": ""
	},
	"interval": 60,
  "mongodb": {
	  "url": "mongodb://localhost/magedb",
	  "poolSize": 1
	}
}
```
