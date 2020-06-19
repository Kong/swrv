#!/bin/sh

set -e

echo "running unit tests with @vue/composition-api $1"
yarn add -W -D @vue/composition-api@$1
yarn build:esm # needed for ssr
yarn test
