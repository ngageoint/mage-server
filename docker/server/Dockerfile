FROM node:10.17.0

ARG MAGE_VER=5.4.4

LABEL author="NGA"

RUN apt-get update && apt-get -y install \
        sudo \
        git \
        unzip \
        curl \
        graphicsmagick \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r mage \
    && useradd -m -r -s /bin/bash -g mage mage \
    && mkdir -p /var/lib/mage \
    && chown mage:mage /var/lib/mage

USER mage

ENV MAGE_HOME /home/mage/mage-server-${MAGE_VER}
WORKDIR /home/mage

RUN curl -L "https://github.com/ngageoint/mage-server/archive/${MAGE_VER}.zip" -o mage-server.zip \
    && unzip mage-server.zip

WORKDIR ${MAGE_HOME}
RUN rm -rf node_modules && \
    mkdir node_modules && \
    npm install && \
    npm run build-web

VOLUME /var/lib/mage

EXPOSE 4242

ENTRYPOINT ["node", "./app.js"]
