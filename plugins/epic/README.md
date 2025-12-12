# MAGE EPIC plugin

The mage-epic plugin replicates MAGE observations to an ESRI ArcGIS server using [ESRI's ReST API](http://resources.arcgis.com/en/help/rest/apiref/).

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