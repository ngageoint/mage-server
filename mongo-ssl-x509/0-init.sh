

user_server=$(openssl x509 -subject -nameopt RFC2253 -in /etc/ssl/certs/mage-server.crt.pem | head -1 | sed 's/^subject= //' | sed 's/^subject=//')
echo 'Adding user to mongo' $user_server
mongo --eval "db.getSiblingDB('\$external').createUser({ user: '$user_server', roles: [{ role: 'readWrite', db: 'mage' }]})"
