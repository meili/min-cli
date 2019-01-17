import * as path from 'path'
import * as colors from 'colors'
import * as _ from 'lodash'
import { config } from '../util'

// ALL	所有级别，包括定制级别。
// TRACE	比 DEBUG 级别的粒度更细。
// DEBUG	指明细致的事件信息，对调试应用最有用。
// INFO	指明描述信息，从粗粒度上描述了应用运行过程。
// TIP	指明提示信息，比 INFO 级别的粒度更高些。
// WARN	指明潜在的有害状况。
// ERROR	指明错误事件，但应用可能还能继续运行。
// FATAL	指明非常严重的错误事件，可能会导致应用终止执行。
// OFF	最高级别，用于关闭日志。

export interface LogType {
  color: string
  desc: string
  level: number
}

export const LogLevel = {
  ALL: 0,
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  TIP: 4,
  WARN: 5,
  ERROR: 6,
  FATAL: 7,
  OFF: 8
}

export const LogType = {
  'FATAL': {
    color: 'red',
    desc: 'FATAL',
    level: LogLevel.FATAL
  },
  'ERROR': {
    color: 'red',
    desc: 'ERROR',
    level: LogLevel.ERROR
  },
  'WARN': {
    color: 'yellow',
    desc: 'WARN',
    level: LogLevel.WARN
  },
  'CHANGE': {
    color: 'bgYellow',
    desc: '变更',
    level: LogLevel.WARN
  },
  'DELETE': {
    color: 'bgMagenta',
    desc: '删除',
    level: LogLevel.WARN
  },
  'TIP': {
    color: 'magenta',
    desc: '提示',
    level: LogLevel.TIP
  },
  'CREATE': {
    color: 'green',
    desc: '创建',
    level: LogLevel.TIP
  },
  'WATCH': {
    color: 'magenta',
    desc: '监听',
    level: LogLevel.TIP
  },
  'BUILD': {
    color: 'blue',
    desc: '编译',
    level: LogLevel.TIP
  },
  'INFO': {
    color: 'grey',
    desc: '信息',
    level: LogLevel.INFO
  },
  'RUN': {
    color: 'blue',
    desc: '执行',
    level: LogLevel.INFO
  },
  'COMPRESS': {
    color: 'blue',
    desc: '压缩',
    level: LogLevel.INFO
  },
  'COMPLETE': {
    color: 'green',
    desc: '完成',
    level: LogLevel.INFO
  },
  'WRITE': {
    color: 'green',
    desc: '写入',
    level: LogLevel.INFO
  },
  'GENERATE': {
    color: 'green',
    desc: '生成',
    level: LogLevel.INFO
  },
  'COPY': {
    color: 'yellow',
    desc: '拷贝',
    level: LogLevel.INFO
  },
  'DEBUG': {
    color: 'red',
    desc: '调试',
    level: LogLevel.DEBUG
  },
  'TRACE': {
    color: 'red',
    desc: '跟踪',
    level: LogLevel.TRACE
  }
}

colors.setTheme(LogType)

function getDateTime (date = new Date(), format = 'HH:mm:ss') {
  let fn = (d: number) => {
    return ('0' + d).slice(-2)
  }
  if (date && _.isString(date)) {
    date = new Date(Date.parse(date))
  }
  const formats = {
    YYYY: date.getFullYear(),
    MM: fn(date.getMonth() + 1),
    DD: fn(date.getDate()),
    HH: fn(date.getHours()),
    mm: fn(date.getMinutes()),
    ss: fn(date.getSeconds())
  }
  return format.replace(/([a-z])\1+/ig, function (a) {
    return formats[a] || a
  })
}

export const log = {
  type: LogType,
  fatal (msg: string | Error) {
    this.msg(LogType.FATAL, msg)
  },
  error (err: string | Error) {
    let msg = _.isString(err) ? err : err.stack
    this.msg(LogType.ERROR, msg)
  },
  warn (msg: string) {
    this.msg(LogType.WARN, msg)
  },
  tip (msg: string) {
    this.msg(LogType.TIP, msg)
  },
  info (msg: string) {
    this.msg(LogType.INFO, msg)
  },
  debug (msg: string) {
    this.msg(LogType.DEBUG, msg)
  },
  msg (logType: LogType, msg: string | Error | Object | any[]) {
    if (logType.level < config.log.level) {
      return
    }

    let dateTime = config.log.time
      ? colors.gray(`[${getDateTime()}] `)
      : ''

    if (_.isError(msg)) {
      msg = msg.message
    } else if (_.isPlainObject(msg) || _.isArray(msg)) {
      msg = JSON.stringify(msg)
    }

    if (this.cb) {
      this.cb(msg, logType, dateTime)
    } else {
      let color = colors[logType.color]
      msg = dateTime + color(`[${logType.desc}]`) + ' ' + msg

      if (logType.level >= LogLevel.WARN) {
        console.error(msg)
      } else {
        console.log(msg)
      }
    }
  },
  output (logType: LogType, msg: string, file: string) {
    this.msg(logType, msg + ' in ' + path.relative(config.cwd, file))
  },
  newline () {
    console.log('')
  },
  register (cb: Function) {
    this.cb = cb
  },
  unRegister () {
    this.cb = null
  }
}
