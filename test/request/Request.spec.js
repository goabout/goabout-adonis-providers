const Request = require('../../request/Request')
const { Env } = require('@adonisjs/sink')


describe('RequestService', () => {
  beforeEach(() => {
    this.Env = new Env()

    this.fakeRequestLib = (options, cb) => {
      setTimeout(() => {
        this.requestOptions = options
        cb(this.callback.error, this.response)
      })
    }

    this.request = new Request(this.fakeRequestLib, this.Env, config.Log, config.Errors, config.Raven)
  })

  describe('send', () => {
    beforeEach(() => {
      this.token = fake.word
      this.url = fake.url
      this.method = 'GET'
      this.query = { 'some-query-key': fake.word }

      this.requestBody = { 'some-body-key': fake.word }

      this.successResponse = {
        statusCode: 200,
        headers: { 'some-header': fake.word },
        body: { item: fake.word },
        halBody: { halProp: fake.word },
        somethingExtra: fake.word
      }

      this.errorResponse = {
        statusCode: 400,
        body: { message: fake.sentence }
      }
    })

    it('should make successful GET request', async () => {
      this.request.promisifedRequest = sandbox.stub().resolves(this.successResponse)

      await this.request.send({
        method: this.method,
        url: this.url,
        token: this.token,
        query: this.query
      })

      // Call args of request
      const requestArgs = this.request.promisifedRequest.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, this.method)
      assert.equal(requestArgs.url, this.url)
      assert.equal(requestArgs.qs, this.query)
      assert.equal(requestArgs.json, true)

      assert.notEqual(Object.keys(requestArgs.headers).length, 0)
      assert.equal(requestArgs.headers.Authorization, `Bearer ${this.token}`)
      assert.equal(requestArgs.headers.Accept, 'application/hal+json,application/json')
      assert.equal(requestArgs.body, undefined)
    })

    it('should make successful POST request with body', async () => {
      this.request.promisifedRequest = sandbox.stub().resolves(this.successResponse)
      this.method = 'POST'

      await this.request.send({
        method: this.method,
        url: this.url,
        token: this.token,
        body: this.requestBody
      })

      // Call args of request
      const requestArgs = this.request.promisifedRequest.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, this.method)
      assert.equal(requestArgs.url, this.url)
      assert.equal(requestArgs.body, this.requestBody)
    })

    it('should reject if request failed because of non-technical reasons', async () => {
      this.request.promisifedRequest = sandbox.stub().resolves(this.errorResponse)

      try {
        await this.request.send({
          method: this.method,
          url: this.url,
          token: this.fakeToken
        })
      } catch (error) {
        this.error = error
      }

      assert.equal(this.error.status, 400)
      assert.equal(this.error.message, 'E_BAD_REQUEST')
    })

    it('should reject if request itself failed and report to Raven (aka 500s and timeouts)', async () => {
      this.promiseError = new Error()
      this.request.promisifedRequest = sandbox.stub().rejects(this.promiseError)

      try {
        await this.request.send({
          method: this.method,
          url: this.url,
          token: this.fakeToken
        })
      } catch (error) {
        this.error = error
      }

      assert.equal(this.error.status, 500)
      assert.equal(this.error.message, 'E_NO_RESPONSE_FROM_THE_SIDE_PARTY')

      assert.deepEqual(config.Raven.captureException.getCall(0).args[0], this.promiseError)
    })

    it('should omit extra stuff in the returned answer', async () => {
      this.request.promisifedRequest = sandbox.stub().resolves(this.successResponse)

      const result = await this.request.send({
        method: this.method,
        url: this.url,
        token: this.fakeToken
      })

      assert.equal(result.body, this.successResponse.body)
      assert.equal(result.headers, this.successResponse.headers)
      assert.equal(result.statusCode, this.successResponse.statusCode)
      assert.equal(result.halBody, this.successResponse.halBody)
      assert.equal(result.somethingExtra, undefined)
    })
  })

  describe('promisifedRequest', () => {
    beforeEach(async () => {
      this.response = {
        code: 200
      }

      this.responseHal = {
        code: 200,
        headers: {
          'content-type': 'Application/hal+json'
        },
        body: `{
          "item": "yep",
          "_links": {
            "self": {
              "href": "https://self.href"
            }
          }
        }`
      }

      this.callback = {
        error: null
      }
    })

    it('should send request to the initial library', async () => {
      const options = { url: 'https://hel.lo' }
      const result = await this.request.promisifedRequest(options)

      assert(this.requestOptions.url === options.url)
      assert(result === this.response)
    })

    it('should parse hal to halBody if available', async () => {
      this.response = this.responseHal

      const options = { url: 'https://hel.lo' }
      const result = await this.request.promisifedRequest(options)

      assert.equal(result.halBody.getLink('self').href, 'https://self.href')
    })

    it('should return error when failed', async () => {
      this.callback.error = new Error('SOME_ERROR')
      const options = { url: 'https://hel.lo' }

      try {
        await this.request.promisifedRequest(options)
      } catch (err) {
        this.errorResult = err
      }

      assert.equal(this.errorResult, this.callback.error)
    })
  })
})
