FROM registry1.dso.mil/ironbank/opensource/nodejs/debian/nodejs:20.11.1
ARG SERVICE_VERSION=6.4.0-beta.1
ARG WEB_VERSION=6.4.0-beta.1

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
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service" ]
