# Contributing :monkey_face:

Hello, and welcome! This document is a WIP for now...

Consult the Table of Contents below, and jump to the desired section.

## Table of Contents

- [Deploying](#deploying)

## Deploying

After merging a PR, you will want to get it up on the registry for everyone to
use.

1. bump the version according to [semver](https://semver.org/) in the
   package.json of the repo with the appropriate new version `x.x.x`
1. `git commit` with the message `chore(release) x.x.x` directly to your local
   master.
1. Build the library artifacts `yarn build`
1. Login as an authorized npm user (has access to swrv npm package)
1. `npm publish`
1. Once published, git push to origin/master and draft a github release
   following the naming conventions of the other releases.
