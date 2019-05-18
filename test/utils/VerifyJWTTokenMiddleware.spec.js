const jwt = require('jsonwebtoken')
const VerifyJWTToken = require('../../utils/VerifyJWTTokenMiddleware')
const { Env } = require('@adonisjs/sink')
const moment = require('moment')

describe('VerifyJWTToken', () => {
  beforeEach(async () => {
    this.env = new Env()

    this.Request = {}

    this.middleware = new VerifyJWTToken(config.Log, config.Errors, this.env, this.Request)

    this.jwtToken = 'some_token_some_token_some_token_some_token_some_token_some_token_some_token_some_token_some_token_some_token_some_token'
    this.fakePem = 'some_pem'

    this.jwtDecodedResult = {
      iss: 'https://goabout.eu.auth0.com/',
      sub: 'auth0|5a0cf675a392a9407758acc2',
      aud:
      ['https://api.goabout.com',
        'https://goabout.eu.auth0.com/userinfo'],
      exp: 1516128707
    }

    this.fakeRequest = {}
    this.fakeResponse = {}
    this.calledNext = false
    this.fakeNext = async () => { this.calledNext = !this.calledNext }
  })

  describe('Handle', () => {
    beforeEach(() => {
      sandbox.stub(this.middleware, 'getPem').returns(this.fakePem)
      sandbox.stub(this.middleware, 'getNewPem').resolves()

      sandbox.stub(this.middleware, 'isExpiredPem')
      sandbox.stub(jwt, 'verify')

      process.env.OAUTH_ISSUER = 'SOME_ISSUER,SOME_ISSUER_2'
      process.env.OAUTH_AUDIENCE = 'SOME_AUDIENCE'

      this.fakeRequest.token = this.jwtToken
    })

    afterEach(() => {
      process.env.OAUTH_ISSUER = undefined
      process.env.OAUTH_AUDIENCE = undefined
    })

    it('should verify JWT Token and set it to the request', async () => {
      this.middleware.isExpiredPem.returns(false)
      jwt.verify.returns(this.jwtDecodedResult)

      await this.middleware.handle({ request: this.fakeRequest, response: this.fakeResponse }, this.fakeNext)

      assert.equal(jwt.verify.getCall(0).args[0], this.jwtToken)
      assert.equal(jwt.verify.getCall(0).args[1], this.fakePem)
      assert.deepEqual(jwt.verify.getCall(0).args[2], { 'audience': 'SOME_AUDIENCE', 'issuer': ['SOME_ISSUER', 'SOME_ISSUER_2'] })

      assert.deepEqual(this.fakeRequest.jwtToken, this.jwtDecodedResult)
      assert(this.calledNext)
    })

    it('should get pem if it is not yet loaded or expired', async () => {
      this.middleware.isExpiredPem.returns(true)
      jwt.verify.returns(this.jwtDecodedResult)

      await this.middleware.handle({ request: this.fakeRequest, response: this.fakeResponse }, this.fakeNext)

      assert(this.middleware.getNewPem.called)
      assert(this.middleware.getPem.called)
      assert(this.calledNext)
    })

    it('should skip getting pem if it already loaded', async () => {
      this.middleware.isExpiredPem.returns(false)
      jwt.verify.returns(this.jwtDecodedResult)

      await this.middleware.handle({ request: this.fakeRequest, response: this.fakeResponse }, this.fakeNext)

      assert(!this.middleware.getNewPem.called)
      assert(this.middleware.getPem.called)
      assert(this.calledNext)
    })

    it('should skip if no token', async () => {
      this.fakeRequest.token = undefined

      await this.middleware.handle({ request: this.fakeRequest, response: this.fakeResponse }, this.fakeNext)

      assert(!jwt.verify.called)
      assert(this.calledNext)
    })

    it('should skip if it a bearer token', async () => {
      this.fakeRequest.token = 'some_short_bearer_token'

      await this.middleware.handle({ request: this.fakeRequest, response: this.fakeResponse }, this.fakeNext)

      assert(!jwt.verify.called)
      assert(this.calledNext)
    })

    it('should return 403 if the token is invalid', async () => {
      jwt.verify.throws('Error!')

      try {
        await this.middleware.handle({ request: this.fakeRequest, response: this.fakeResponse }, this.fakeNext)
        assert.fails()
      } catch (e) {
        assert.equal(e.message, 'E_UNAUTHORIZED')
      }

      assert(!this.calledNext)
    })
  })

  describe('isExpiredPem', () => {
    it('should return true if no $pem', () => {
      this.middleware.setPem(null)
      assert.equal(this.middleware.isExpiredPem(), true)
    })

    it('should return true if pem expired', () => {
      this.middleware.setPem('some_key', moment().subtract(1, 'minutes'))
      assert.equal(this.middleware.isExpiredPem(), true)
    })

    it('should return false if no pem did not expire yet', () => {
      this.middleware.setPem('some_key', moment().add(1, 'minutes'))
      assert.equal(this.middleware.isExpiredPem(), false)
    })
  })

  describe('getNewPem', () => {
    beforeEach(() => {
      this.fakePemResponse = {
        body: {
          keys: [{ x5c: ['some_key'] }]
        }
      }

      this.Request.send = sandbox.stub().resolves(this.fakePemResponse)
    })

    it('should throw error if oath url is not set', async () => {
      try {
        await this.middleware.getNewPem()
        assert.fail()
      } catch (err) {
        assert.equal(err.message, 'E_NO_OAUTH_PEM_KEY_LINK')
      }

      assert(!this.Request.send.called)
    })

    it('should get PEM key and set it', async () => {
      process.env.OAUTH_PEM = 'SOME_URL'

      await this.middleware.getNewPem()
      assert.equal(this.middleware.getPem(), '-----BEGIN CERTIFICATE-----\nsome_key\n-----END CERTIFICATE-----')

      assert.deepEqual(this.Request.send.getCall(0).args[0], { url: 'SOME_URL' })

      process.env.OAUTH_PEM = undefined
    })
  })
})
