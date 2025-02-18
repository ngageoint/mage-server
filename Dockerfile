# Build service
FROM node:20.11.1 AS build-service

WORKDIR /service
COPY service/package*.json ./
RUN npm install
COPY service/ ./
RUN npm run build

RUN npm pack

# Build web-app
FROM node:20.11.1 AS build-webapp

WORKDIR /web-app
COPY web-app/package*.json ./
RUN npm install
COPY web-app/ ./
RUN npm run build

RUN npm pack ./dist

FROM node:20.11.1 AS build-arcwebplugin
# Build arcgis service plugin
WORKDIR /arcgiswebplugin
COPY plugins/arcgis/web-app/package*.json ./
RUN npm install
COPY --from=build-service /service /arcgisserviceplugin/node_modules/@ngageoint/mage.service
COPY plugins/arcgis/web-app/ ./
RUN npm run build
RUN npm pack ./dist/main

FROM node:20.11.1 AS build-arcserviceplugin
WORKDIR /arcgisserviceplugin
COPY plugins/arcgis/service/package*.json ./
RUN npm install
COPY --from=build-service /service /arcgisserviceplugin/node_modules/@ngageoint/mage.service
COPY plugins/arcgis/service/ ./
RUN npm run build
RUN npm pack

FROM node:20.11.1 AS build-imageserviceplugin
WORKDIR /imageserviceplugin
COPY plugins/image/service/package*.json ./
RUN npm install
COPY --from=build-service /service /imageserviceplugin/node_modules/@ngageoint/mage.service
RUN rm -rf /imageserviceplugin/node_modules/@ngageoint/mage.service/node_modules/mongoose
COPY plugins/image/service/ ./
RUN npm run build
RUN npm pack

# Build instance
FROM node:20.11.1 AS build-instance
COPY --from=build-service /service/ngageoint*.tgz /service/
COPY --from=build-webapp /web-app/ngageoint*.tgz /web-app/
COPY --from=build-arcwebplugin /arcgiswebplugin/ngageoint*.tgz /arcgiswebplugin/
COPY --from=build-arcserviceplugin /arcgisserviceplugin/ngageoint*.tgz /arcgisserviceplugin/
COPY --from=build-imageserviceplugin /imageserviceplugin/ngageoint*.tgz /imageserviceplugin/

WORKDIR /instance
RUN npm install ../service/ngageoint-mage.service*.tgz \
    npm install ../web-app/ngageoint-mage.web-app*.tgz \
    npm install ../arcgiswebplugin/ngageoint*.tgz \
    npm install ../arcgisserviceplugin/ngageoint*.tgz \ 
    npm install ../imageserviceplugin/ngageoint*.tgz


ENV NODE_PATH=./node_modules
ENTRYPOINT [ \ 
    "./node_modules/.bin/mage.service", \
    "--plugin", "@ngageoint/mage.image.service", \
    "--plugin", "@ngageoint/mage.arcgis.service", \
    "--web-plugin", "@ngageoint/mage.arcgis.web-app" \
    ]
