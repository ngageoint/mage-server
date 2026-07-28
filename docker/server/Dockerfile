ARG BUILD_IMAGE="node:24-slim"
ARG DIST_IMAGE="ghcr.io/ngageoint/mage-server/ironbank/google/distroless13/nodejs-24:nonroot"
ARG MAGE_INSTANCE="/mage/instance"

FROM ${BUILD_IMAGE} AS build-instance

LABEL author="NGA"

ARG CORE_VERSION="latest"
ARG ARCGIS_VERSION="latest"
ARG SFTP_VERSION="latest"
ARG MSI_VERSION="latest"
ARG IMAGE_VERSION="latest"
ARG MAGE_INSTANCE
WORKDIR ${MAGE_INSTANCE}

RUN set -eux; \
  npm i --omit=dev @ngageoint/mage.service@${CORE_VERSION}; \
  npm i --omit=dev @ngageoint/mage.web-app@${CORE_VERSION}; \
  [ -n "${ARCGIS_VERSION}" ] && \
  npm i --omit=dev @ngageoint/mage.arcgis.service@${ARCGIS_VERSION} @ngageoint/mage.arcgis.web-app@${ARCGIS_VERSION}; \
  [ -n "${SFTP_VERSION}" ] && \
  npm i --omit=dev @ngageoint/mage.sftp.service@${SFTP_VERSION} @ngageoint/mage.sftp.web@${SFTP_VERSION}; \
  [ -n "${MSI_VERSION}" ] && \
  npm i --omit=dev @ngageoint/mage.nga-msi@${MSI_VERSION}; \
  [ -n "${IMAGE_VERSION}" ] && \
  npm i --omit=dev @ngageoint/mage.image.service@${IMAGE_VERSION}; \
  ln -sfn ./node_modules/.bin/mage.service ./mage.service

FROM ${DIST_IMAGE}
ARG MAGE_INSTANCE
# create the mage data base directory as DIST_IMAGE nonroot user
WORKDIR /var/lib/mage
# set user to 999 as historically mage images were built with user/group 999
# and 999 owns the files of existing deployments
USER 999:999
COPY --chown=999:999 --from=build-instance ${MAGE_INSTANCE}/ ${MAGE_INSTANCE}/
WORKDIR ${MAGE_INSTANCE}
VOLUME /var/lib/mage
EXPOSE 4242

CMD [ "./mage.service" ]