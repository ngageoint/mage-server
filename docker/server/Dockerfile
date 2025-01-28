FROM node:18-slim

ARG service_version=latest
ARG web_version=${service_version}
ARG image_version=latest
ARG msi_version=latest

LABEL author="NGA"

USER root

RUN apt-get update

RUN groupadd -r mage \
    && useradd -m -r -s /bin/bash -g mage mage \
    && mkdir -p /var/lib/mage \
    && chown mage:mage /var/lib/mage

USER mage
ENV MAGE_HOME /home/mage/instance
WORKDIR ${MAGE_HOME}
RUN ls -l \
    && npm i --omit dev @ngageoint/mage.service@${service_version} \
    && npm i --omit dev @ngageoint/mage.web-app@${web_version} \
    && npm i --omit dev @ngageoint/mage.image.service@${image_version} \
    && npm i --omit dev @ngageoint/mage.nga-msi@${msi_version} \
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service", "--plugin", "@ngageoint/mage.image.service", "--plugin", "@ngageoint/mage.nga-msi" ]
