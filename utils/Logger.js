const winston = require('winston')

const initializeLogger = (loggingLevel, nodeEnv, CLS) => {
  const jsonFormatter = winston.format((info, opts) => {
    if (CLS) {
      info.session_id = CLS.get('session')
      info.user_id = CLS.get('userUid')
    }

    return info
  })

  // Log in string format for local
  const localOutput = [
    winston.format.colorize(),
    winston.format.splat(),
    winston.format.simple()
  ]

  // Log in json format for prod
  const prodOutput = [
    jsonFormatter(),
    winston.format.json()
  ]

  const pickedOutput = nodeEnv === 'production' ? prodOutput : localOutput

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(...pickedOutput)
    })
  ]

  // Leave the 1st element for log leve;l
  const logInfo = [null]

  const logger = winston.createLogger({
    transports,
    level: loggingLevel
  })

  logInfo[0] = `Log level is ${logger.level}`

  logger.outputInfo = () => {
    logInfo.forEach(info => logger.info(info))
  }

  return logger
}

module.exports = initializeLogger
