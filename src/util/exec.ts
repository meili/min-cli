import { spawn, SpawnOptions } from 'child_process'

export interface ExecResult {
  code: number,
  stderr: string
  stdout: string
}

export function exec (command: string, args: string[], verbose: boolean = false, options: SpawnOptions): Promise<ExecResult> {
  return new Promise<ExecResult>((resolve, reject) => {
    if (verbose) {
      options = Object.assign(options, {
        stdio: 'inherit'
      })
    }
    command = /^win/.test(process.platform) ? `${command}.cmd` : command
    const child = spawn(command, args, options)

    let stdout = ''
    let stderr = ''

    if (!verbose) {
      child.stdout.on('data', (data) => {
        stdout += data
      })

      child.stderr.on('data', (data) => {
        stderr += data
      })
    }

    child.on('error', (err) => {
      reject(err)
    })

    child.on('close', (code) => {
      // if (code !== 0) {
      //   return reject(new Error(`process exited with code ${code}`))
      // }

      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      })
    })
  })
}
