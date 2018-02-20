#!/bin/sh
set -e

dirname=`dirname "$0"`

section() {
  [ -z "$TRAVIS" ] || echo -en "travis_fold:start:$1\\r"
  scripts/$1.sh
  [ -z "$TRAVIS" ] || echo -en "travis_fold:end:$1\\r"
}

git clone git@github.com:goabout/travis-ci-scripts.git ./scripts
chmod -R +x ./scripts

# Run preparation in current context to export vars
. scripts/preparation-common.sh

# section setup-adonis
section test-adonis
# section build-adonis
# section release-common
# section deploy-common
