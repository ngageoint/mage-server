ARG BASE_IMAGE="node:24-slim"

FROM $BASE_IMAGE AS build-service
WORKDIR /service
COPY service/ ./
RUN npm ci
RUN npm run build
WORKDIR /packages
RUN npm pack /service

FROM $BASE_IMAGE AS build-web-app
WORKDIR /web-app
COPY web-app/ ./
RUN npm ci
RUN npm run build
WORKDIR /packages
RUN npm pack /web-app/dist/app
RUN npm pack /web-app/dist/core-lib

FROM $BASE_IMAGE AS build-image-service
WORKDIR /image.service
COPY plugins/image/service/ ./
COPY --from=build-service /packages/ /packages
RUN npm i /packages/ngageoint-mage.service-*.tgz
RUN npm run build
RUN npm pack

FROM $BASE_IMAGE AS build-arcgis-service
WORKDIR /arcgis.service
COPY plugins/arcgis/service/ ./
COPY --from=build-service /packages/ /packages
RUN npm i /packages/ngageoint-mage.service-*.tgz
RUN npm run build
RUN npm pack

FROM $BASE_IMAGE AS build-arcgis-web
WORKDIR /arcgis.web
COPY plugins/arcgis/web-app/ ./
COPY --from=build-web-app /packages/ /packages
# TODO: uncomment this line to build with local core-lib when web plugin is upgraded to angular 20
# RUN npm i /packages/ngageoint-mage.web-core-lib-*.tgz
# TODO: remoove this line after activating above line
RUN npm ci
RUN npm run build
RUN npm pack ./dist/main

FROM $BASE_IMAGE AS build-sftp-service
WORKDIR /sftp.service
COPY plugins/sftp/service/ ./
COPY --from=build-service /packages/ /packages
RUN npm i /packages/ngageoint-mage.service-*.tgz
RUN npm run build
RUN npm pack

FROM $BASE_IMAGE AS build-sftp-web
WORKDIR /sftp.web
COPY plugins/sftp/web/ ./
COPY --from=build-web-app /packages/ /packages
# TODO: uncomment this line to build with local core-lib when web plugin is upgraded to angular 20
# RUN npm i /packages/ngageoint-mage.web-core-lib-*.tgz
# TODO: remoove this line after activating above line
RUN npm ci
RUN npm run build
RUN npm pack ./dist/main

# Build instance
FROM $BASE_IMAGE AS build-instance
ENV MAGE_HOME=/home/mage/instance
WORKDIR ${MAGE_HOME}
COPY --from=build-service /packages/ngageoint-mage.service-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-web-app /packages/ngageoint-mage.web-app-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-image-service /image.service/ngageoint-mage.image.service-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-arcgis-service /arcgis.service/ngageoint-mage.*.tgz ${MAGE_HOME}/packages/
COPY --from=build-arcgis-web /arcgis.web/ngageoint-mage.arcgis.web-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-sftp-service /sftp.service/ngageoint-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-sftp-web /sftp.web/ngageoint-*.tgz ${MAGE_HOME}/packages/

# TODO: remove --force after upgrading web plugins
RUN npm install --force --omit dev ${MAGE_HOME}/packages/*.tgz
RUN ln -s ./node_modules/.bin/mage.service

ENTRYPOINT [ "./mage.service" ]