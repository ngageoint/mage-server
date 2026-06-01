ARG BASE_IMAGE=node:22-slim
FROM ${BASE_IMAGE}

LABEL author="NGA"

ARG SERVER_VERSION=6.6.2
ARG ARC_VERSION=NONE
ARG SFTP_VERSION=NONE
ARG MSI_VERSION=1.0.6

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends libfontconfig1 libfreetype6 \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd -r mage \
  && useradd -m -r -s /bin/bash -g mage mage \
  && mkdir -p /var/lib/mage \
  && chown mage:mage /var/lib/mage

USER mage
ENV MAGE_HOME=/home/mage/instance
WORKDIR ${MAGE_HOME}

RUN set -eux; \
  npm i --omit=dev @ngageoint/mage.service@${SERVER_VERSION}; \
  npm i --omit=dev @ngageoint/mage.web-app@${SERVER_VERSION}; \
  cd ./node_modules/@ngageoint; \
  ln -sfn mage.web-app web-app; \
  cd ${MAGE_HOME}; \
  if [ "${ARC_VERSION}" != "NONE" ]; then \
  npm i --omit=dev --legacy-peer-deps @ngageoint/mage.arcgis.service@${ARC_VERSION} @ngageoint/mage.arcgis.web-app@${ARC_VERSION}; \
  fi; \
  if [ "${SFTP_VERSION}" != "NONE" ]; then \
  npm i --omit=dev --legacy-peer-deps @ngageoint/mage.sftp.service@${SFTP_VERSION} @ngageoint/mage.sftp.web@${SFTP_VERSION}; \
  fi; \
  if [ "${MSI_VERSION}" != "NONE" ]; then \
  npm i --omit=dev --legacy-peer-deps @ngageoint/mage.nga-msi@${MSI_VERSION}; \
  fi; \
  ln -sfn ./node_modules/.bin/mage.service ./mage.service; \
  ADMIN_INDEX="$(find ./node_modules/@ngageoint/mage.web-app -maxdepth 12 -type f -name index.html | grep -i '/admin' | head -n 1 || true)"; \
  if [ -z "${ADMIN_INDEX}" ]; then ADMIN_INDEX="$(find ./node_modules/@ngageoint/mage.web-app -maxdepth 12 -type f -name index.html | head -n 1 || true)"; fi; \
  test -n "${ADMIN_INDEX}"; \
  ADMIN_DIR="$(dirname "${ADMIN_INDEX}")"; \
  mkdir -p ./node_modules/@ngageoint/web-app/dist/admin; \
  cp -a "${ADMIN_DIR}/." ./node_modules/@ngageoint/web-app/dist/admin/; \
  test -f ./node_modules/@ngageoint/web-app/dist/admin/index.html; \
  test -f ./node_modules/@ngageoint/web-app/dist/admin/main*.js || true

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT ["./mage.service", "--plugin", "@ngageoint/mage.arcgis.service", "--plugin", "@ngageoint/mage.sftp.service", "--plugin", "@ngageoint/mage.nga-msi", "--web-plugin", "@ngageoint/mage.arcgis.web-app", "--web-plugin", "@ngageoint/mage.sftp.web"]