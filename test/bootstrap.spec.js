process.setMaxListeners(300)
process.env.ENV_PATH = '.env.test'
require('./globals.spec')()
const Logger = require('../providers/Logger')
const Errors = require('../providers/Errors').bare()

// Global before hook
before(done => {
  done()
})

after(done => {
  done()
})

beforeEach(function* () {
  t.Log = Logger.bare('off')

  t.Raven = {
    captureException: sandbox.stub()
  }

  t.Errors = Errors
})

afterEach(function* () {
  v = {} //eslint-disable-line
  sandbox.restore()
})
