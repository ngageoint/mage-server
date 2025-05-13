# Build with arcgis plugin
> This plugin allows for MAGE observation data to be passed to an Arcgis feature service. Follow the instructions in the root README.

## Build ArcGIS plugin
- After completing the web-app package install and build in the 'Building from source' section:

```bash
cd plugins/arcgis/service
npm ci
npm link ../../../service # **IMPORTANT** see root README
npm run build
```
```bash
cd plugins/arcgis/web-app
npm ci
npm link ../../../web-app # **IMPORTANT** see root README
npm run build
```

- Continue to install dependencies in the `instance` package as instructed in the root README.

## Setting up OAuth for Feature Layers

### [ArcGIS](`https://arcgis.geointnext.com/arcgis/home/content.html`) Website
- *Content* -> *New Item (button)* -> *Developer Credentials*
  + *Redirect URLs*
    - `https://{mage-server-url}@ngageoint/mage.arcgis.service/oauth/authenticate`
      + Mage Server URL example: `magedevd.geointnext.com/plugins/`
  + *Application Environment*: can be left as *Multiple*
  + *URL*: optional
- After creating the new OAuth *app*/credentials
  + Write down ***Client ID***
- *Content* -> any *Feature Layer*
  + Write down ***URL*** (bottom-right)

### Mage ***Admin*** (shield icon)
- ArcGIS *tab* -> *Feature Layers* -> *Add Feature Service*
  + *URL*: copied from *Feature Layer* above
  + *Authentication*: *OAuth*
    - *Client Id*: copied from *OAuth Client Id* above
  + Click *Create Feature*
- You will know it works if it redirects:
  + *Request for Permission* pop-up with the new OAuth you just created.
  + click *Allow* -> it will redirect *back* to the Mage server