class Logger {
  enabled: boolean = false
  prefix: string = 'GHREPO'

  #log(type: 'log' | 'error' | 'warn', ...args: any[]) {
    if (this.enabled) {
      this.#verboseLog(type, ...args)
    }
  }

  #verboseLog(type: 'log' | 'error' | 'warn', ...args: any[]) {
    console[type](`[${this.prefix}]`, ...args)
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
