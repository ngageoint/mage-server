#!/usr/bin/env bash

# this script requires GitHub CLI https://cli.github.com/
# note the --platform argument to the docker build command.  if you require
# a different platform architecture for your image, such as arm, modify the
# argument accordingly.  see https://docs.docker.com/build/building/multi-platform/

release_version=$1

if [[ -z "${release_version}" ]]
then
  echo ""
  echo "error:"
  echo "  please supply the release version to build corresponding to a "
  echo "  release name from https://github.com/ngageoint/mage-server/releases"
  echo "  e.g., build_release.sh 6.2.0"
  echo ""
  exit 1
fi

# # TODO: might move away from this release tag prefix business
# release_prefix="releases"
# [[ "${release_version}" =~ [0-9]+-[a-zA-Z0-9]+\.[0-9]+$ ]] && release_prefix="prereleases"
# release_tag="${release_prefix}/${release_version}"
release_tag="${release_version}"
gh release --repo ngageoint/mage-server download ${release_tag}
docker build . --platform linux/amd64 -t "mage-server:${release_version}"
