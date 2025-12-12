# MAGE RAGE plugin

The mage-rage plugin replicates all MAGE data to another MAGE server.

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
