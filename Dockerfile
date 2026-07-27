ARG BUILD_IMAGE="node:24-slim"
ARG DIST_IMAGE="ghcr.io/ngageoint/mage-server/ironbank/google/distroless13/nodejs-24:nonroot"
ARG MAGE_HOME="/mage"
ARG MAGE_SERVER="${MAGE_HOME}/mage-server"
ARG MAGE_PACKAGES="${MAGE_HOME}/packages"
ARG MAGE_INSTANCE="${MAGE_HOME}/instance"

FROM ${BUILD_IMAGE} AS build-instance
ARG MAGE_HOME
ARG MAGE_SERVER
ARG MAGE_PACKAGES
ARG MAGE_INSTANCE
ENV MAGE_HOME=${MAGE_HOME}
ENV MAGE_SERVER=${MAGE_SERVER}
ENV MAGE_PACKAGES=${MAGE_PACKAGES}
ENV MAGE_INSTANCE=${MAGE_INSTANCE}
RUN mkdir -p ${MAGE_SERVER} ${MAGE_PACKAGES}
COPY ./ ${MAGE_SERVER}/

RUN cd ${MAGE_SERVER}/service \
    && npm ci \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/service

RUN cd ${MAGE_SERVER}/web-app \
    && npm ci \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/web-app/dist/app \
    && npm pack ${MAGE_SERVER}/web-app/dist/core-lib

RUN cd ${MAGE_SERVER}/plugins/image/service \
    && npm link ../../../service \
    && npm run build && \
    cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/plugins/image/service

RUN cd ${MAGE_SERVER}/plugins/sftp/service \
    && npm link ../../../service \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/plugins/sftp/service

RUN cd ${MAGE_SERVER}/plugins/sftp/web \
    && npm link ../../../web-app/dist/core-lib \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/plugins/sftp/web/dist/main

RUN cd ${MAGE_SERVER}/plugins/arcgis/service \
    && npm link ../../../service \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/plugins/arcgis/service

RUN cd ${MAGE_SERVER}/plugins/arcgis/web-app \
    && npm link ../../../web-app/dist/core-lib \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/plugins/arcgis/web-app/dist/main

RUN cd ${MAGE_SERVER}/plugins/nga-msi \
    && npm link ../../service \
    && npm run build \
    && cd ${MAGE_PACKAGES} \
    && npm pack ${MAGE_SERVER}/plugins/nga-msi

WORKDIR ${MAGE_INSTANCE}
RUN cd ${MAGE_INSTANCE} \
    && npm install --omit dev --force \
    ${MAGE_PACKAGES}/ngageoint-mage.service-*.tgz \
    ${MAGE_PACKAGES}/ngageoint-mage.web-app-*.tgz \
    ${MAGE_PACKAGES}/ngageoint-mage.sftp.*.tgz \
    ${MAGE_PACKAGES}/ngageoint-mage.arcgis.*.tgz \
    ${MAGE_PACKAGES}/ngageoint-mage.image.*.tgz \
    ${MAGE_PACKAGES}/ngageoint-mage.nga-msi.*.tgz \
    && ln -s ./node_modules/.bin/mage.service

FROM ${DIST_IMAGE}
# create the mage data base directory as DIST_IMAGE nonroot user
WORKDIR /var/lib/mage
ARG MAGE_INSTANCE
ENV MAGE_INSTANCE=${MAGE_INSTANCE}
# set user to 999 as historically mage images were built with user/group 999
# and 999 owns the files of existing deployments
USER 999:999
COPY --chown=999:999 --from=build-instance ${MAGE_INSTANCE}/ ${MAGE_INSTANCE}/
WORKDIR ${MAGE_INSTANCE}
VOLUME /var/lib/mage
EXPOSE 4242

CMD [ "./mage.service" ]
