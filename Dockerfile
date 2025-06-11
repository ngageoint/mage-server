FROM node:18

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
RUN npm install @ngageoint/mage.service@6.2.13 
RUN npm install @ngageoint/mage.web-app@6.2.13

RUN ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service" ]