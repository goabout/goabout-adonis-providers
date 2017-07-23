const Request = require('../../providers/Request').bare()

describe('RequestService', () => {
  beforeEach(() => {
    t.fakeRequestLib = function (options, cb) {
      setTimeout(() => {
        t.requestOptions = options
        cb(t.callback.error, t.response)
      })
    }

    t.request = new Request(t.fakeRequestLib, t.Env, t.Log, t.Errors, t.Raven)
  })

  describe('send', () => {
    beforeEach(() => {
      t.token = fake.word
      t.url = fake.url
      t.method = 'GET'
      t.query = { 'some-query-key': fake.word }

      t.requestBody = { 'some-body-key': fake.word }

      t.successResponse = {
        statusCode: 200,
        headers: { 'some-header': fake.word },
        body: { item: fake.word },
        halBody: { halProp: fake.word },
        somethingExtra: fake.word
      }

      t.errorResponse = {
        statusCode: 400,
        body: { message: fake.sentence }
      }
    })

    it('should make successful GET request', function* () {
      t.request.promisifedRequest = sandbox.stub().resolves(t.successResponse)

      yield t.request.send({
        method: t.method,
        url: t.url,
        token: t.token,
        query: t.query
      })

      // Call args of request
      const requestArgs = t.request.promisifedRequest.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, t.method)
      assert.equal(requestArgs.url, t.url)
      assert.equal(requestArgs.qs, t.query)
      assert.equal(requestArgs.json, true)

      assert.notEqual(Object.keys(requestArgs.headers).length, 0)
      assert.equal(requestArgs.headers.Authorization, `Bearer ${t.token}`)
      assert.equal(requestArgs.headers.Accept, 'application/hal+json,application/json')
      assert.equal(requestArgs.body, undefined)
    })

    it('should make successful POST request with body', function* () {
      t.request.promisifedRequest = sandbox.stub().resolves(t.successResponse)
      t.method = 'POST'

      yield t.request.send({
        method: t.method,
        url: t.url,
        token: t.token,
        body: t.requestBody
      })

      // Call args of request
      const requestArgs = t.request.promisifedRequest.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, t.method)
      assert.equal(requestArgs.url, t.url)
      assert.equal(requestArgs.body, t.requestBody)
    })

    it('should reject if request failed because of non-technical reasons', function* () {
      t.request.promisifedRequest = sandbox.stub().resolves(t.errorResponse)

      try {
        yield t.request.send({
          method: t.method,
          url: t.url,
          token: t.fakeToken
        })
      } catch (error) {
        t.error = error
      }

      assert.equal(t.error.status, 400)
      assert.equal(t.error.message, 'E_PROVIDER_FAILED')
      assert.equal(t.error.details, t.errorResponse.body.message)

      assert.equal(t.Raven.captureException.getCall(0).args[0], t.error)
      assert.deepEqual(t.Raven.captureException.getCall(0).args[1], {
        url: t.url,
        response: t.errorResponse.body
      })
    })

    it('should reject if request itself failed and report to Raven (aka 500s and timeouts)', function* () {
      t.promiseError = new Error()
      t.request.promisifedRequest = sandbox.stub().rejects(t.promiseError)

      try {
        yield t.request.send({
          method: t.method,
          url: t.url,
          token: t.fakeToken
        })
      } catch (error) {
        t.error = error
      }

      assert.equal(t.error.status, 500)
      assert.equal(t.error.message, 'E_PROVIDER_API_IS_DOWN')

      assert.deepEqual(t.Raven.captureException.getCall(0).args[0], t.promiseError)
    })

    it('should omit extra stuff in the returned answer', function* () {
      t.request.promisifedRequest = sandbox.stub().resolves(t.successResponse)

      const result = yield t.request.send({
        method: t.method,
        url: t.url,
        token: t.fakeToken
      })

      assert.equal(result.body, t.successResponse.body)
      assert.equal(result.headers, t.successResponse.headers)
      assert.equal(result.statusCode, t.successResponse.statusCode)
      assert.equal(result.halBody, t.successResponse.halBody)
      assert.equal(result.somethingExtra, undefined)
    })
  })

  describe('promisifedRequest', () => {
    beforeEach(function* () {
      t.response = {
        code: 200
      }

      t.responseHal = {
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

      t.callback = {
        error: null
      }
    })

    it('should send request to the initial library', function* () {
      const options = { url: 'https://hel.lo' }
      const result = yield t.request.promisifedRequest(options)

      assert(t.requestOptions.url === options.url)
      assert(result === t.response)
    })

    it('should parse hal to halBody if available', function* () {
      t.response = t.responseHal

      const options = { url: 'https://hel.lo' }
      const result = yield t.request.promisifedRequest(options)

      assert.equal(result.halBody.getLink('self').href, 'https://self.href')
    })

    it('should return error when failed', function* () {
      t.callback.error = new Error('SOME_ERROR')
      const options = { url: 'https://hel.lo' }

      try {
        yield t.request.promisifedRequest(options)
      } catch (err) {
        t.errorResult = err
      }

      assert.equal(t.errorResult, t.callback.error)
    })
  })
})
