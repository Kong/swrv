#!/bin/sh

set -e

tests/test-compat.sh "2.7.0"
tests/test-compat.sh "2.7.8"
# tests/test-compat.sh "3.1.5"
# tests/test-compat.sh "3.2.31"
