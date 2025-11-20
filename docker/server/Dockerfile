ARG BASE_IMAGE=node:20.11.1-slim

FROM $BASE_IMAGE
LABEL author="NGA"

ARG SERVER_VERSION=6.5.1-beta
ARG ARC_VERSION=NONE
ARG SFTP_VERSION=NONE
ARG MSI_VERSION=NONE

USER root

RUN apt-get update

RUN groupadd -r mage \
    && useradd -m -r -s /bin/bash -g mage mage \
    && mkdir -p /var/lib/mage \
    && chown mage:mage /var/lib/mage

USER mage
ENV MAGE_HOME=/home/mage/instance
WORKDIR ${MAGE_HOME}
RUN ls -l \
    && npm i --omit dev @ngageoint/mage.service@${SERVER_VERSION} \
    && npm i --omit dev @ngageoint/mage.web-app@${SERVER_VERSION} \
    && if [ "$ARC_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.arcgis.service@${ARC_VERSION} @ngageoint/mage.arcgis.web-app@${ARC_VERSION}; fi\
    && if [ "$SFTP_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.sftp.service@${SFTP_VERSION} @ngageoint/mage.sftp.web@${SFTP_VERSION}; fi \
    && if [ "$MSI_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.nga-msi@${MSI_VERSION}; fi \
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service", \
    "--plugin", "@ngageoint/mage.arcgis.service", \
    "--plugin", "@ngageoint/mage.sftp.service", \
    "--plugin", "@ngageoint/mage.nga-msi", \
    "--web-plugin", "@ngageoint/mage.arcgis.web-app", \
    "--web-plugin", "@ngageoint/mage.sftp.web"]
