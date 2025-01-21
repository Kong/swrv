#!/bin/sh

set -e

tests/test-compat.sh "3.2.47"
tests/test-compat.sh "3.3.13"
tests/test-compat.sh "3.4.38"
tests/test-compat.sh "latest"
