#!/usr/bin/env node

import * as _ from 'lodash'
import * as program from 'commander'
import commands from '../index'
import { log } from '../util'

const minPkg = require('../../package.json')

program
  .version(minPkg.version)
  .option('-v', '--version', () => {
    console.log(minPkg.version)
  })
  .usage('<command> [options]')

commands.forEach(command => {

  // create command
  let cmd = program.command(command.name)

  // set alias
  if (command.alias) {
    cmd.alias(command.alias)
  }

  // set usage
  if (command.usage) {
    cmd.usage(command.usage)
  }

  // set description
  if (command.description) {
    cmd.description(command.description)
  }

  // set options
  if (command.options && command.options.length) {
    let options: string[][] = command.options
    options.forEach((option: string[]) => {
      cmd.option(option[0], option[1])
    })
  }

  // set on
  if (_.isObject(command.on)) {
    _.forIn(command.on, (value, key) => {
      cmd.on(key, value)
    })
  }

  // set action
  if (command.action) {
    cmd.action(async (...args) => {
      try {
        await command.action.apply(command, args)
      } catch (err) {
        log.error(err)
      }
    })
  }
})

if (process.argv.length === 2) {
  program.outputHelp()
}

program.parse(process.argv)
