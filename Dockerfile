FROM node:20.11.1

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
    && npm i --omit dev @ngageoint/mage.service@6.2.9 \
    && npm i --omit dev @ngageoint/mage.web-app@6.2.9 \
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service" ]