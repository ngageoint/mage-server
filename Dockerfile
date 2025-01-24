# Build service
FROM node:20.11.1 AS build-service

WORKDIR /service
COPY service/package*.json ./
RUN npm install
COPY service/ ./
RUN npm run build

# RUN rm -rf node_modules
# RUN npm pack

# Build web-app
FROM node:20.11.1 AS build-webapp

WORKDIR /web-app
COPY web-app/package*.json ./
RUN npm install
COPY web-app/ ./
RUN npm run build

# RUN rm -rf node_modules
# RUN npm pack

# Build instance
FROM node:20.11.1 AS build-instance

COPY --from=build-service /service/lib /service/lib
COPY --from=build-service /service/package*.json /service/
COPY --from=build-service /service/bin /service/bin
COPY --from=build-service /service/node_modules /service/node_modules
COPY --from=build-webapp /web-app/dist /web-app/dist
COPY --from=build-webapp /web-app/node_modules /web-app/node_modules
COPY --from=build-webapp /web-app/package*.json /web-app/

# COPY --from=build-service /service /service
# COPY --from=build-webapp /web-app /web-app

# COPY --from=build-service /service/ngageoint*.tgz /service/
# COPY --from=build-webapp /web-app/ngageoint*.tgz /web-app/

WORKDIR /instance
# COPY /instance/package.json /instance/package.json
# RUN npm install
# RUN npm install ../service/ngageoint-mage.service*.tgz \
#     npm install ../web-app/ngageoint-mage.web-app*.tgz

RUN npm install ../service ../web-app/dist
ENV NODE_PATH=./node_modules
ENTRYPOINT [ "./node_modules/.bin/mage.service" ]
