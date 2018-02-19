const _ = require('lodash')

class FakeRaven {
  constructor(Log) {
    // Construct an object which silently blocks all the calls
    ['captureException', 'context', 'setContext', 'captureBreadcrumb'].forEach(name => {
      this[name] = exception => {
        Log.error(exception.stack)
        Log.error(JSON.stringify(_.omit(exception, 'stack')))
      }
    })
  }
}

module.exports = FakeRaven
