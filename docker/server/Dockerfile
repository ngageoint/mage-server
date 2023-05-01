FROM node:16.17.0-slim

LABEL author="NGA"

WORKDIR /root/building

RUN apt-get update && apt-get -y install \
    curl \
    git \
    sudo \
    unzip

RUN groupadd -r mage \
    && useradd -m -r -s /bin/bash -g mage mage \
    && mkdir -p /var/lib/mage \
    && chown mage:mage /var/lib/mage

USER mage
ENV MAGE_HOME /home/mage/instance
WORKDIR ${MAGE_HOME}
# add other plugin tarballs below
# TODO: this build should change to install from NPM registry now that 6.2.2+ is published there
COPY \
    ./ngageoint-mage.service-*.tgz \
    ./ngageoint-mage.web-app-*.tgz \
    ./ngageoint-mage.image.service-*.tgz \
    ./ngageoint-mage.nga-msi-*.tgz \
    ./
RUN ls -l && npm i --omit=dev ngageoint-mage.service-*.tgz \
    && npm i --omit=dev ngageoint-mage.web-app-*.tgz \
    && npm i --omit=dev ngageoint-mage.image.service-*.tgz \
    && npm i --omit=dev ngageoint-mage.nga-msi-*.tgz \
    && rm *.tgz \
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service", "--plugin", "@ngageoint/mage.image.service", "--plugin", "@ngageoint/mage.nga-msi" ]
