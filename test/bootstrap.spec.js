process.setMaxListeners(300)
process.env.ENV_PATH = '.env.test'
require('./globals.spec')()
const Logger = require('../utils/Logger')
const Errors = require('../errors/Errors')

// Global before hook
before(() => {
})

after(() => {
})

beforeEach(() => {
  config.Log = Logger('off')

  config.Raven = {
    captureException: sandbox.stub()
  }

  config.Errors = new Errors()
  config.Errors.localize = ({ m }) => m
})

afterEach(() => {
  config = {}
  sandbox.restore()
})
