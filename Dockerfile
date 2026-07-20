ARG BASE_IMAGE="node:24-slim"

FROM $BASE_IMAGE AS node-base

FROM node-base AS build-packages

RUN mkdir /packages
WORKDIR /mage-server
COPY ./ ./

RUN cd service \
    && npm ci \
    && npm run build \
    && cd /packages \
    && npm pack /mage-server/service

RUN cd web-app \
    && npm ci \
    && npm run build \
    && cd /packages \
    && npm pack /mage-server/web-app/dist/app \
    && npm pack /mage-server/web-app/dist/core-lib

RUN cd plugins/image/service \
    && npm link ../../../service \
    && npm run build && \
    cd /packages \
    && npm pack /mage-server/plugins/image/service

RUN cd plugins/sftp/service \
    && npm link ../../../service \
    && npm run build \
    && cd /packages \
    && npm pack /mage-server/plugins/sftp/service

RUN cd plugins/sftp/web \
    && npm link ../../../web-app/dist/core-lib \
    && npm run build \
    && cd /packages \
    && npm pack /mage-server/plugins/sftp/web

RUN cd plugins/arcgis/service \
    && npm link ../../../service \
    && npm run build \
    && cd /packages \
    && npm pack /mage-server/plugins/arcgis/service

RUN cd plugins/arcgis/web-app \
    && npm link ../../../web-app/dist/core-lib \
    && npm run build \
    && cd /packages \
    && npm pack /mage-server/plugins/arcgis/web-app

FROM node-base AS build-instance
ENV MAGE_HOME=/home/mage/instance
WORKDIR ${MAGE_HOME}
COPY --from=build-packages /packages ${MAGE_HOME}/packages/
RUN npm install --force --omit dev ${MAGE_HOME}/packages/*.tgz
RUN ln -s ./node_modules/.bin/mage.service

ENTRYPOINT [ "./mage.service" ]