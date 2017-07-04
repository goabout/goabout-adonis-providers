#!/bin/sh

set -e

dirname=`dirname "$0"`
cd "$dirname/.."
echo "PHASE: Test..."

node_modules/.bin/gulp test
yarn run lint
