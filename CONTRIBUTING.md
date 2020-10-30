# Contributing :monkey_face: <!-- omit in toc -->

Hello, and welcome! Whether you are looking for help, trying to report a bug,
thinking about getting involved in the project or about to submit a patch, this
document is for you! Its intent is to be both an entry point for newcomers to
the community (with various technical backgrounds), and a guide/reference for
contributors and maintainers.

Consult the Table of Contents below, and jump to the desired section.

- [Development](#development)
  - [Code Style](#code-style)
  - [Linting](#linting)
  - [Running Tests](#running-tests)
  - [Verifying the Build Output](#verifying-the-build-output)
- [Deploying](#deploying)

## Development

This project uses the [vue-cli](https://cli.vuejs.org/) for linting, testing,
and building. See package.json for all currently used plugins.

### Code Style

If it passes linting, YOLO. Improvements to ASCII art encouraged.

### Linting

```sh
# Autofixes any linting issues
yarn lint

# Outputs linting issues that need to be fixed without fixing
yarn lint --no-fix
```

### Running Tests

Swrv has a suite of unit tests that are meant to be as comprehensive as
possible. They run in CI and are required to pass in order to merge.

```sh
# Run all tests
yarn test

# Run all tests and watch file changes to trigger a rerun (also enters jest mode to filter tests)
yarn test --watchAll

# Run just a single test file
yarn test use-swrv
```

Tests can get you most of the way there when developing a new feature. However,
you will want to test it in a real app eventually.

### Verifying the Build Output

This could be better experience. If you want to develop swrv and test that the
esm/dist bundles are working correctly, you can run the build command and copy
the bundle to your project.

```sh
yarn build
```

Output inside `esm`, and `dist` will contain output from `tsc` build. Move this
into your project and change import statements. Using `yarn link` is an exercise
left to the reader. Contributions to this doc are welcome if you get it working!

## Deploying

> Note: this is for maintainers of the repo, with access to publish to NPM

After merging a PR, you will want to get it up on the registry for everyone to
use.

1. bump the version according to [semver](https://semver.org/) in the
   package.json of the repo with the appropriate new version `x.x.x`
1. `git commit` with the message `chore(release) x.x.x` directly to your local
   master.
1. Build the library artifacts `yarn build`
1. Login as an authorized npm user (has access to swrv npm package)
1. `npm publish`
1. Once published, git push to origin/master
1. draft a github release following the naming conventions of the other
   releases.
