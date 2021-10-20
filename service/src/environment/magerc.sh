#!/usr/bin/env sh

# the IP address of the interface to which the web server will bind
export MAGE_ADDRESS=0.0.0.0
# the port on which the web server will listen for connections
export MAGE_PORT=4242
# directory where mage stores user icons and avatars
export MAGE_USER_DIR=/var/lib/mage/users
# directory where mage stores map symbology icons
export MAGE_ICON_DIR=/var/lib/mage/icons
# directory where mage stores observation attachments
export MAGE_ATTACHMENT_DIR=/var/lib/mage/attachments
# directory where mage stores layers
export MAGE_LAYER_DIR=/var/lib/mage/layers
# directory where mage stores secure secrets
export MAGE_SECURITY_DIR=/var/lib/mage/security
# directory where mage stores temporary files
export MAGE_TEMP_DIR=/tmp
# Location where mage stores file exports
export MAGE_EXPORT_DIR=/var/lib/mage/export
# Interval the expoprt files TTL's are checked in seconds
export MAGE_EXPORT_SWEEP_INTERVAL=28800
# Time to live for export files & metadata in seconds
export MAGE_EXPORT_TTL=259200
# number of seconds an authentication token is valid; default 28800 (8 hours)
export MAGE_TOKEN_EXPIRATION=28800
# the URL that specifies MAGE's connection to mongodb
export MAGE_MONGO_URL=mongodb://127.0.0.1:27017/magedb
# whether to use secure, TLS sockets to connect to mongo
export MAGE_MONGO_SSL=false
# the size of MAGE's mongodb connection pool
export MAGE_MONGO_POOL_SIZE=5
# the user name MAGE uses to authenticate to mongodb
export MAGE_MONGO_USER=
# the password MAGE uses to authenticate to mongodb
export MAGE_MONGO_PASSWORD=
# (optional) the mongodb replica set name
export MAGE_MONGO_REPLICA_SET=
# the PEM text or path to the file containing the private key for 2-way SSL/x509 certificate authentication from the server to mongodb
# when either of these values are present, they override MAGE_MONGO_USER, and MAGE will attempt to use mongodb x509 authentication
# (https://docs.mongodb.com/v3.6/core/security-x.509/), rather than user/password authentication.  a literal value present in
# MAGE_MONGO_X509_KEY takes precedence over the file counterpart, and MAGE will assume the same arrangement for the other X509 variables.
# one cannot therefore mix MAGE_MONGO_X509_KEY with MAGE_MONGO_X509_CERT_FILE to create a valid configuration.  if the key is
# encrypted with a password, MAGE uses the value of MAGE_MONGO_PASSWORD to decrypt the key.
export MAGE_MONGO_X509_KEY=
export MAGE_MONGO_X509_KEY_FILE=
# the PEM text or path to the file containing the public certificate complement to MAGE_MONGO_X509_KEY
export MAGE_MONGO_X509_CERT=
export MAGE_MONGO_X509_CERT_FILE=
# the PEM text or path to the file containing the root authority x509 certificate used to sign both the mongodb certificate and the MAGE server certificate (above)
export MAGE_MONGO_X509_CA_CERT=
export MAGE_MONGO_X509_CA_CERT_FILE=
# total seconds to attempt to establish a connection to mongodb before giving up and exiting
export MAGE_MONGO_CONN_TIMEOUT=300
# seconds between attempts to connect to mongodb
export MAGE_MONGO_CONN_RETRY_DELAY=5

