# Build:
# docker build -t jiatfs/mage .
#
# Run:
# docker run -it jiatfs/mage
#
# Compose:
# docker-compose up -d

FROM node:alpine
MAINTAINER Steffen Kory

# The Mongodb host and port to be passed as runtime environment vars and args during build.
ARG MONGO_HOST
ARG MONGO_PORT
ENV MONGO_HOST ${MONGO_HOST}
ENV MONGO_PORT ${MONGO_PORT}

# Set development environment as default
ENV NODE_ENV development

# 80 = HTTP, 443 = HTTPS, 3000 = mage server, 35729 = livereload, 8080 = node-inspector
EXPOSE 80 443 3000 35729 8080

# Install Mage prerequisites
RUN apk update && apk add \
    git \
    graphicsmagick \
    sudo

RUN npm install -g --quiet \
    bower \
    forever \
    grunt \
    istanbul \
    mocha

# Create project directory
RUN mkdir -p /opt/mage
WORKDIR /opt/mage

# Copies the local files and install npm packages
COPY package.json /opt/mage/package.json
COPY . /opt/mage
RUN npm install --quiet && npm cache clean --force

# Build and run migrations
RUN npm run build
RUN npm run migrate

# Run mage server
CMD forever start app.js