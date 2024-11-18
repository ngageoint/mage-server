# Build with arcgis plugin

Follow the instructions in the root README. After completing the web-app package install and build in the 'Building from source' section:

Build arcgis plugin:
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

Continue to install dependencies in the `instance` package as instructed in the root README. 