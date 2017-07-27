process.setMaxListeners(300)
process.env.ENV_PATH = '.env.test'
require('./globals.spec')()
const Logger = require('../utils/Logger')
const Errors = require('../errors/Errors')

// Global before hook
before(done => {
  done()
})

after(done => {
  done()
})

beforeEach(function* () {
  t.Log = Logger('off')

  t.Raven = {
    captureException: sandbox.stub()
  }

  t.Errors = Errors
})

afterEach(function* () {
  v = {} //eslint-disable-line
  sandbox.restore()
})
