class Logger {
  enabled: boolean = false
  prefix: string = 'ghrepo'

  #typeColor = {
    log: 0,
    error: 31,
    warn: 33,
  }

  #log(type: 'log' | 'error' | 'warn', ...args: any[]) {
    if (this.enabled) {
      this.#verboseLog(type, ...args)
    }
  }

  #verboseLog(type: 'log' | 'error' | 'warn', ...args: any[]) {
    const prefix = `\x1b[34m[${this.prefix}]`
    const color = this.#typeColor[type] ?? 0
    const colorStr = `\x1b[${color}m`
    const time = new Date()
    const hrs = time.getHours().toString().padStart(2, '0')
    const mns = time.getMinutes().toString().padStart(2, '0')
    const scs = time.getSeconds().toString().padStart(2, '0')
    const timeStr = `\x1b[2m${hrs}:${mns}:${scs}`
    const typeStr = type !== 'log' ? ' ' + type.toUpperCase() : ''
    console[type](`${timeStr} ${prefix}${colorStr}${typeStr}`, ...args)
  }

  log(...args: any[]) {
    this.#log('log', ...args)
  }

  error(...args: any[]) {
    this.#verboseLog('error', ...args)
  }

  warn(...args: any[]) {
    this.#verboseLog('warn', ...args)
  }
}

export const logger = new Logger()
