process.setMaxListeners(300)
process.env.ENV_PATH = '.env.test'
require('./globals.spec')()
const Logger = require('../providers/Logger')

// Global before hook
before(done => {
  done()
})

after(done => {
  done()
})

beforeEach(function* () {
  v.log = Logger.bare('off')

  v.Env = {
    vars: {
    },
    get(key) {
      return this.vars[key] || undefined
    }
  }

  v.Raven = {
    captureException: sandbox.stub()
  }
})

afterEach(function* () {
  v = {} //eslint-disable-line
  sandbox.restore()
})
