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
  t.log = Logger.bare('off')

  t.Env = {
    vars: {
    },
    get(key) {
      return this.vars[key] || undefined
    }
  }

  t.Raven = {
    captureException: sandbox.stub()
  }
})

afterEach(function* () {
  v = {} //eslint-disable-line
  sandbox.restore()
})
