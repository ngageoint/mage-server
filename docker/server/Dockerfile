FROM registry1.dso.mil/ironbank/opensource/nodejs/debian/nodejs:20.11.1

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
    && npm i --omit dev @ngageoint/mage.service@6.3.0-beta.9 \
    && npm i --omit dev @ngageoint/mage.web-app@6.3.0-beta.9 \
    && npm i --omit dev @ngageoint/mage.arcgis.service@1.0.0-beta.1 \
    && npm i --omit dev @ngageoint/mage.arcgis.web-app@1.0.0 \
    && npm i --omit dev @ngageoint/mage.sftp.service@1.0.0-beta.1 \
    && npm i --omit dev @ngageoint/mage.sftp.web@1.0.0-beta.1 \
    && npm i --omit dev @ngageoint/mage.nga-msi@1.0.5 \
    && npm i --omit dev @ngageoint/mage.image.service@1.1.0-beta.2 \
    && ln -s ./node_modules/.bin/mage.service

VOLUME /var/lib/mage
EXPOSE 4242

ENTRYPOINT [ "./mage.service", \
    "--plugin", "@ngageoint/mage.arcgis.service", \
    "--plugin", "@ngageoint/mage.sftp.service", \
    "--plugin", "@ngageoint/mage.nga-msi", \
    "--plugin", "@ngageoint/mage.image.service", \
    "--web-plugin", "@ngageoint/mage.arcgis.web-app", \
    "--web-plugin", "@ngageoint/mage.sftp.web"]
