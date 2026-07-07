ARG BASE_IMAGE="node:24"

FROM $BASE_IMAGE AS build-service
WORKDIR /service
COPY service/ ./
RUN npm ci
RUN npm run build
RUN npm pack

# Build web-app
FROM $BASE_IMAGE AS build-webapp
WORKDIR /web-app
COPY web-app/ ./
RUN npm ci
RUN npm run build
RUN npm pack ./dist/app

FROM $BASE_IMAGE AS build-image-service
WORKDIR /image.service
COPY plugins/image/service/ ./
RUN npm ci
RUN npm run build
RUN npm pack

# FROM $BASE_IMAGE AS build-arcgis-web
# WORKDIR /arcgis.web
# COPY plugins/arcgis/web-app/ ./
# RUN npm ci
# RUN npm run build
# RUN npm pack ./dist/main

# FROM $BASE_IMAGE AS build-arcgis-service
# WORKDIR /arcgis.service
# COPY plugins/arcgis/service/ ./
# RUN npm ci
# RUN npm run build
# RUN npm pack

# FROM $BASE_IMAGE AS build-sftp-service
# WORKDIR /sftp.service
# COPY plugins/sftp/service/ ./
# RUN npm ci
# RUN npm run build
# RUN npm pack

# FROM $BASE_IMAGE AS build-sftp-web
# WORKDIR /sftp.web
# COPY plugins/sftp/web/ ./
# RUN npm ci
# RUN npm run build
# RUN npm pack ./dist/main

# Build instance
FROM $BASE_IMAGE AS build-instance
ENV MAGE_HOME=/home/mage/instance
WORKDIR ${MAGE_HOME}
COPY --from=build-service /service/ngageoint-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-webapp /web-app/ngageoint-*.tgz ${MAGE_HOME}/packages/
COPY --from=build-image-service /image.service/ngageoint-*.tgz ${MAGE_HOME}/packages/
# COPY --from=build-arcgis-web /arcgis.web/ngageoint-*.tgz ${MAGE_HOME}/packages/
# COPY --from=build-arcgis-service /arcgis.service/ngageoint-*.tgz ${MAGE_HOME}/packages/
# COPY --from=build-sftp-service /sftp.service/ngageoint-*.tgz ${MAGE_HOME}/packages/
# COPY --from=build-sftp-web /sftp.web/ngageoint-*.tgz ${MAGE_HOME}/packages/

RUN npm install --omit dev ${MAGE_HOME}/packages/*.tgz
RUN ln -s ./node_modules/.bin/mage.service

ENTRYPOINT [ "./mage.service" ]