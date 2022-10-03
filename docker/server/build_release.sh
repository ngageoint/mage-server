#!/usr/bin/env bash

release_version=$1
gh release --repo ngageoint/mage-server download ${release_version}
docker build . -t "mage-server:${release_version}"
