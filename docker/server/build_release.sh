#!/usr/bin/env bash

release_version=$1
# TODO: might move away from this release tag prefix business
release_prefix="releases"
[[ "${release_version}" =~ [0-9]+-[a-zA-Z0-9]+\.[0-9]+$ ]] && release_prefix="prereleases"
release_tag="${release_prefix}/${release_version}"
gh release --repo ngageoint/mage-server download ${release_tag}
docker build . -t "mage-server:${release_version}"
