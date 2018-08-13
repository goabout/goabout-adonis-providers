const Auth0 = require('../../auth0/Auth0')
const { Env } = require('@adonisjs/sink')

describe('Auth0', () => {
  beforeEach(() => {
    this.Request = { send: sandbox.stub() }
    this.Env = new Env()

    this.Env.set('OAUTH_ISSUER', 'https://goabout.eu.auth0.com/')
    this.Env.set('OAUTH_AUDIENCE', 'https://api.goabout.com')
    this.Env.set('OAUTH_CLIENT_ID', 'client-id')
    this.Env.set('OAUTH_CLIENT_SECRET', 'client-secret')

    this.auth0 = new Auth0({
      Request: this.Request,
      Env: this.Env,
      Errors: config.Errors,
      Log: config.Log
    })

    sandbox.stub(this.auth0, 'saveTokenToRedis').resolves()
    sandbox.stub(this.auth0, 'getTokenFromRedis').resolves()
  })

  describe('getToken', () => {
    beforeEach(() => {
      this.accessToken = 'ABCDEF'
      this.answer = {
        statusCode: 200,
        body: {
          'access_token': 'ABCDEF',
          'expires_in': 120
        }
      }
    })

    it('should successfully obtain a fresh token', async () => {
      this.Request.send.resolves(this.answer)

      const result = await this.auth0.getToken()
      assert.equal(result, this.accessToken)

      assert.deepEqual(this.Request.send.getCall(0).args[0], {
        'body': {
          'grant_type': 'client_credentials',
          'client_id': 'client-id',
          'audience': 'https://api.goabout.com',
          'client_secret': 'client-secret'
        },
        json: true,
        'method': 'POST',
        'url': 'https://goabout.eu.auth0.com/oauth/token'
      })
    })

    it('should save token to redis whenever possible', async () => {
      this.Request.send.resolves(this.answer)
      await this.auth0.getToken()
      assert.deepEqual(this.auth0.saveTokenToRedis.getCall(0).args[0], {
        'expireTime': 120,
        'token': 'ABCDEF'
      })
    })

    it('should obtain token from Redis when possbile', async () => {
      this.auth0.getTokenFromRedis.resolves(this.accessToken)

      const result = await this.auth0.getToken()

      assert.equal(result, this.accessToken)
      assert.equal(this.Request.send.called, false)
    })

    // Whenever we can test actual redis behaviour
    it.skip('should save token to redis with expire time minus 60 sec', async () => {
      this.auth0.$request.send.resolves(this.answer)
      await this.auth0.getToken()

      const result = await this.Redis.get('auth0:client_credentials')
      assert.equal(result, this.accessToken)

      const expireTime = await this.Redis.ttl('auth0:client_credentials')
      assert(expireTime >= 55)
      assert(expireTime <= 60)
    })

    it.skip('should obtain token from Redis when possbile', async () => {
      const anotherToken = 'DCBAQ'
      this.Redis.set('auth0:client_credentials', anotherToken)

      const result = await this.auth0.getToken()

      assert.equal(result, anotherToken)
      assert.equal(this.auth0.$request.send.called, false)
    })
  })
})
