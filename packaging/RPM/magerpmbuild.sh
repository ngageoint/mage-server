#!/usr/bin/env bash

# This script checks out the supplied mage tags, installs the required
# modules using npm, and packages it up into a tar.gz to ***REMOVED***ist in creating
# the RPM for the specific version.

# Usage: $ sh magerpmbuild.sh 1.0.0 rc-3

VER=$1
REL=$2

if [ -z $1 ]
    then
        echo "ERROR: Supply a Version Number"
        exit
fi
if [ -z $2 ]
    then
        echo "ERROR: Supply a Release Name"
        exit
fi

echo "Building MAGE RPM tarball..."

svn --non-interactive export https://svn.geointapps.org/svn/sage/branches/dev --username awsserver --p***REMOVED***word 19_upperNike mage-v$VER-$REL
pushd mage-v$1-$2
npm install
popd
tar czvf mage-v$VER-$REL.tar.gz mage-v$VER-$REL
rm -rf mage-v$VER-$REL
mv mage-v$VER-$REL.tar.gz rpmbuild/SOURCES

echo "Complete!"

