FROM registry1.dso.mil/ironbank/opensource/nodejs/debian/nodejs:20.11.1
ARG SERVICE_VERSION=6.4.0-beta.1
ARG WEB_VERSION=6.4.0-beta.1
ARG ARC_SERVICE_VERSION=1.0.0-beta.2
ARG ARC_WEB_VERSION=1.0.0-beta.2
ARG SFTP_SERVICE_VERSION=1.0.0-beta.2
ARG SFTP_WEB_VERSION=1.0.0-beta.2

LABEL author="NGA"

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
    && npm i --omit dev @ngageoint/mage.service@${SERVICE_VERSION} \
    && npm i --omit dev @ngageoint/mage.web-app@${WEB_VERSION} \
    && if [ "$ARC_SERVICE_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.arcgis.service@$ARC_SERVICE_VERSION; fi\
    && if [ "$ARC_WEB_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.arcgis.web-app@$ARC_WEB_VERSION; fi \
    && if [ "$SFTP_SERVICE_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.sftp.service@$SFTP_SERVICE_VERSION; fi \
    && if [ "$SFTP_WEB_VERSION" != "NONE" ]; then npm i --omit dev @ngageoint/mage.sftp.web@$SFTP_WEB_VERSION; fi \
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service", \
    "--plugin", "@ngageoint/mage.arcgis.service", \
    "--plugin", "@ngageoint/mage.sftp.service", \
    "--web-plugin", "@ngageoint/mage.arcgis.web-app", \
    "--web-plugin", "@ngageoint/mage.sftp.web"]
