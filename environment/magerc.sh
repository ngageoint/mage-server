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
export MAGE_ATTACHEMENT_DIR=/var/lib/mage/attachments
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
# total seconds to attempt to establish a connection to mongodb before giving up and exiting
export MAGE_MONGO_CONN_TIMEOUT=300
# seconds between attempts to connect to mongodb
export MAGE_MONGO_CONN_RETRY_DELAY=5