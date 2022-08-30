FROM node:16.17.0-slim

LABEL author="NGA"

WORKDIR /root/building

RUN apt-get update && apt-get -y install \
    curl \
    git \
    sudo \
    unzip

RUN echo "installing github cli ..." \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt update && apt install gh -y \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r mage \
    && useradd -m -r -s /bin/bash -g mage mage \
    && mkdir -p /var/lib/mage \
    && chown mage:mage /var/lib/mage

USER mage

ENV MAGE_HOME /home/mage/instance
WORKDIR /home/mage/instance

ARG MAGE_VERSION=6.2.0
ARG MAGE_RELEASE_TAG=releases/${MAGE_VERSION}
ARG GITHUB_TOKEN
RUN gh release --repo ngageoint/mage-server download ${MAGE_RELEASE_TAG} \
    && npm i --omit=dev ngageoint-mage.service-*.tgz \
    && npm i --omit=dev ngageoint-mage.web-app-*.tgz \
    && npm i --omit=dev ngageoint-mage.image.service-*.tgz \
    && npm i --omit=dev ngageoint-mage.nga-msi-*.tgz \
    && rm *.tgz \
    && ln -s ./node_modules/.bin/mage.service

USER root
RUN apt remove -y gh && rm -rf /var/lib/apt/lists/*

USER mage
WORKDIR ${MAGE_HOME}
VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service", "--plugin", "@ngageoint/mage.image.service", "--plugin", "@ngageoint/mage.nga-msi" ]
