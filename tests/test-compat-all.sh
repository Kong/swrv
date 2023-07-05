#!/bin/sh

set -e

tests/test-compat.sh "3.2.26"
tests/test-compat.sh "3.2.29"
tests/test-compat.sh "3.2.31"
tests/test-compat.sh "3.2.33"
tests/test-compat.sh "3.2.36"
tests/test-compat.sh "3.2.37"
tests/test-compat.sh "3.2.40"
tests/test-compat.sh "3.3.1"
tests/test-compat.sh "latest"
