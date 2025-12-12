MAGE 6.2.x on Amazon Linux 2023

1. Install docker
```
sudo yum install -y docker
# get latest docker compose release from github - https://github.com/docker/compose/releases
compose_version=v2.20.2
curl -LO https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-linux-x86_64
sudo mkdir -p /usr/local/lib/docker/cli-plugins
cd /usr/local/lib/docker/cli-plugins
sudo mv docker-compose-linux-x86_64 /usr/local/lib/docker/cli-plugins/docker-compose-${compose_version}-linux-x86_64
cd /usr/local/lib/docker/cli-plugins
sudo chmod +x ./docker-compose-${compose_version}-linux-x86_64
ln -s docker-compose-${compose_version}-linux-x86_64 docker-compose
```

1. Install Node Version Manager (NVM)
Install NVM from Github - https://github.com/nvm-sh/nvm#installing-and-updating.
For example
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
```

1. Install MongoDB