#!/usr/bin/env bash

set -e
set -x

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR="${DIR}/.."

yarn clean
yarn install
yarn tsc
yarn lint
yarn build

zip -FSr "${ROOT_DIR}/support-reminders.zip ./target"
