## MAGE Plugins

All plugins are seperate node scripts located in the plugins folder.  Each script is configured with the config.json file located in each specific plugins directory.

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

### MAGE RAGE plugin
