'use strict'
const path = require('path')
const pacote = require('pacote') // see: http://npm.im/pacote
const { publish: npmPublish } = require('libnpmpublish')

const publish = async (directory) => {
  if (process.env.DRY_RUN) {
    const pkg = require(path.join(directory, 'package.json'))
    console.log(`${pkg.name}@${pkg.version}`)
  } else {
    const manifest = await pacote.manifest(directory)
    const tarData = await pacote.tarball(directory)
    return npmPublish(manifest, tarData, { forceAuth: { token: process.env.NPM_AUTH_TOKEN } })
  }
}

;(async () => {
  try {
    if (process.env.DRY_RUN) {
      console.warn('Dry run! To publish the release, run the command again without DRY_RUN environment variable')
    }
    const projectRootDirectory = path.join(__dirname, '..')
    await publish(projectRootDirectory)
  } catch (e) {
    console.log('Unable to publish the package', e)
    process.exit(1)
  }
})()
