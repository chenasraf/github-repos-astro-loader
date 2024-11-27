class Logger {
  enabled: boolean = false

  #log(type: 'log' | 'error' | 'warn', ...args: any[]) {
    if (this.enabled) {
      console[type](...args)
    }
  }

  log(...args: any[]) {
    this.#log('log', ...args)
  }

  error(...args: any[]) {
    this.#log('error', ...args)
  }

  warn(...args: any[]) {
    this.#log('warn', ...args)
  }
}

export const logger = new Logger()
