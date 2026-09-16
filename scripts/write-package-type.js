// Both builds emit `.js`, so each one states its own module format rather than
// inheriting the root package's. Declaring both keeps either build correct if the
// root ever gains a `type` field.
const { writeFileSync } = require('fs')

const [dir, type] = process.argv.slice(2)

writeFileSync(`${dir}/package.json`, JSON.stringify({ type }, null, 2) + '\n')
