#!/bin/sh

set -e

tests/test-compat.sh "~0.6.0"
tests/test-compat.sh "1.0.0-beta.17"
tests/test-compat.sh "1.0.0-beta.22"
tests/test-compat.sh "1.0.0-rc.5"
