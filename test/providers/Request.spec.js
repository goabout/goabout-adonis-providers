const Request = require('../../providers/Request').bare()

describe('RequestService', () => {
  describe('sendSkippingErrorHangling', () => {
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

      t.fakeRequestLib = function (options, cb) {
        setTimeout(() => {
          t.requestOptions = options
          cb(t.callback.error, t.response)
        })
      }

      t.request = new Request(t.fakeRequestLib, t.Env, t.log)
    })

    it('should send request to the initial library', function* () {
      const options = { url: 'https://hel.lo' }
      const result = yield t.request.sendSkippingErrorHangling(options)

      assert(t.requestOptions.url === options.url)
      assert(result === t.response)
    })

    it('should parse hal to halBody if available', function* () {
      t.response = t.responseHal

      const options = { url: 'https://hel.lo' }
      const result = yield t.request.sendSkippingErrorHangling(options)

      assert.equal(result.halBody.getLink('self').href, 'https://self.href')
    })

    it('should return error when failed', function* () {
      t.callback.error = new Error('SOME_ERROR')
      const options = { url: 'https://hel.lo' }

      try {
        yield t.request.sendSkippingErrorHangling(options)
      } catch (err) {
        t.errorResult = err
      }

      assert.equal(t.errorResult, t.callback.error)
    })
  })
})
