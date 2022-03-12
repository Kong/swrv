#!/bin/sh

set -e

echo "running unit tests with 'vue@$1'"
yarn add -W -D vue@$1
# yarn build:esm # needed for ssr
yarn test