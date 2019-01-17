import { DevType } from './declare'

import build, { BuildCommand } from './cli/build'
// import changelog, { ChangelogCommand } from './cli/changelog'
// import commit, { CommitCommand } from './cli/commit'
import init, { InitCommand } from './cli/init'
import install, { InstallCommand } from './cli/install'
import $new, { NewCommand } from './cli/new'
import dev, { DevCommand } from './cli/dev'
// import packages, { PackagesCommand } from './cli/packages'
import publish, { PublishCommand } from './cli/publish'
import update, { UpdateCommand } from './cli/update'
// import upgrade, { UpgradeCommand } from './cli/upgrade'

export {
  BuildCommand,
  // ChangelogCommand,
  // CommitCommand,
  InitCommand,
  InstallCommand,
  NewCommand,
  DevCommand,
  // PackagesCommand,
  PublishCommand,
  UpdateCommand,
  // UpgradeCommand,
  DevType
}

export default [
  init,
  $new,
  dev,
  build,
  publish,

  install,
  update
  // packages

  // commit,
  // changelog
  // upgrade
]

exports.getUtil = () => {
  return require('./util')
}

exports.getDeclare = () => {
  return require('./declare')
}
