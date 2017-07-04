const Request = require('../../providers/Request').bare()

describe('RequestService', () => {
  beforeEach(function* () {
    v.requestOptions = null
    v.response = {
      code: 200
    }

    v.responseHal = {
      code: 200,
      headers: {
        'content-type': 'Application/hal+json'
      },
      body: '{ \
        "item": "yep",\
        "_links": {\
          "self": {\
            "href": "https://self.href`"\
          }\
        } \
      }'
    }

    v.callback = {
      error: null
    }

    v.fakeRequestLib = function (options, cb) {
      setTimeout(() => {
        v.requestOptions = options
        cb(v.callback.error, v.response)
      })
    }

    v.request = new Request(v.fakeRequestLib, v.Env, v.log)
  })

  describe('request', () => {
    it('should send request to the initial library', function* () {
      const options = { url: 'https://hel.lo' }
      const result = yield v.request.send(options)

      expect(v.requestOptions.url).to.equal(options.url)
      expect(result).to.equal(v.response)
    })

    it('should parse hal to halBody if available', function* () {
      v.response = v.responseHal

      const options = { url: 'https://hel.lo' }
      const result = yield v.request.send(options)

      expect(result.halBody.getLink('self').href).to.equal('https://self.href`')
    })

    it('should return error when failed', function* () {
      v.callback.error = new Error('SOME_ERROR')
      v.response.code = '400'
      const options = { url: 'https://hel.lo' }

      try {
        yield v.request.send(options)
        expect(true).to.be(false)
      } catch (err) {
        expect(err).to.equal(v.callback.error)
      }
    })
  })
})
