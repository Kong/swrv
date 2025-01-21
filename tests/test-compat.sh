#!/bin/sh

set -e

echo "running unit tests with 'vue@$1'"
yarn add -W -D vue@$1
yarn add -W -D @vue/compiler-sfc@$1

# This is the only way to assure `resolution` field is respected
rm -rf node_modules
yarn install

# yarn build:esm # needed for ssr
yarn test
