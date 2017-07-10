const GoAbout = require('../../providers/GoAbout').bare()
const Errors = require('../../providers/Errors').bare()
const halson = require('halson')

describe('GoAboutService', () => {
  beforeEach(function* () {
    v.token = 'Bearer some-goabout-token'
    v.email = 'example@user.com'
    v.goAboutApi = 'https://api.goabout.com/'

    v.Env.vars.GOABOUT_API = v.goAboutApi

    v.goaboutAnswer = halson({
      _embedded: {
        'http://rels.goabout.com/authenticated-user': {
          email: v.email,
          identifier: 'goabout-identifier',
          validated: true,
          _links: {
            self: {
              href: 'https://api.goabout.com/user/2432'
            },
            'http://rels.goabout.com/subscriptions': {
              href: 'https://api.goabout.com/subscriptions/2432'
            },
            'http://rels.goabout.com/user-bookings': {
              href: 'https://api.goabout.com/bookings/2432'
            }
          }
        }
      }
    })

    v.request = {}

    v.GoAbout = new GoAbout(v.request, v.Env, Errors, v.log, v.Raven)
  })

  describe('checkTokenAndReturnUser', () => {
    it('should make request to GoAbout and return GoAbout user', function* () {
      v.request.send = sandbox.stub().resolves({
        halBody: v.goaboutAnswer
      })

      const result = yield v.GoAbout.checkTokenAndReturnUser(v.token)

      expect(result.email).to.equal(v.email)

      // eslint-disable-next-line
      expect(v.request.send.calledWithExactly({
        url: v.goAboutApi,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${v.token}`
        }
      })).to.be.true
    })

    it('should reject if token is invalid', function* () {
      v.request.send = sandbox.stub().rejects({
        status: 403
      })

      try {
        yield v.GoAbout.checkTokenAndReturnUser(v.token)
        expect(false).to.equal(true) // Never called
      } catch (error) {
        expect(error.message).to.equal('E_UNAUTHORIZED')
      }
    })

    it('should reject if token is anonymous', function* () {
      v.request.send = sandbox.stub().resolves({
        halBody: halson({ version: '123' }) // No user obj
      })

      try {
        yield v.GoAbout.checkTokenAndReturnUser(v.token)
        expect(false).to.equal(true) // Never called
      } catch (error) {
        expect(error.message).to.equal('E_UNAUTHORIZED')
      }
    })
  })

  describe('request', () => {
    beforeEach(() => {
      v.fakeToken = 'wow-wow-wow'

      v.fakeRequestBody = {
        'hello': 'here'
      }

      v.successResponse = {
        statusCode: 200,
        headers: {
          'some-header': 'Hey'
        },
        body: {
          item: 'one'
        },
        halBody: {
          halProp: 'prop'
        },
        somethingExtra: 'is-here'
      }

      v.errorResponse = {
        statusCode: 400,
        body: {
          message: 'Some error explanation'
        }
      }

      v.goAboutRootApi = {
        '_links': {
          'http://rels.goabout.com/geocoder': {
            'href': 'https://api.goabout.com/geocoder/encode{?query,count,types,extratypes,tags}',
            'templated': true
          },
          'http://rels.goabout.com/plan': {
            'href': 'https://api.goabout.com/plan'
          }
        }
      }

      sandbox.stub(v.request, 'send').resolves(v.successResponse)
      sandbox.stub(v.GoAbout, 'getApi').resolves(halson(v.goAboutRootApi))
    })

    it('should make successful GET request to GoAbout(using root api res)', function* () {
      v.request.send = sandbox.stub().resolves(v.successResponse)

      yield v.GoAbout.request({
        method: 'GET',
        relation: 'http://rels.goabout.com/plan',
        token: v.fakeToken
      })

      // Call args of request
      const requestArgs = v.request.send.getCall(0).args[0]

      // Hardcoded params
      expect(requestArgs.method).to.equal('GET')
      expect(requestArgs.url).to.equal('https://api.goabout.com/plan')

      expect(Object.keys(requestArgs.headers).length).not.to.equal(0)
      expect(requestArgs.headers.Authorization).to.equal(`Bearer ${v.fakeToken}`)
      expect(requestArgs.headers.Accept).to.equal('application/hal+json,application/json')
      expect(requestArgs.body).to.equal(undefined)
    })

    it('should make successful POST request to GoAbout (using root api res)', function* () {
      v.request.send = sandbox.stub().resolves(v.successResponse)

      yield v.GoAbout.request({
        method: 'POST',
        relation: 'http://rels.goabout.com/plan',
        token: v.fakeToken,
        body: v.fakeRequestBody
      })

      // Call args of request
      const requestArgs = v.request.send.getCall(0).args[0]

      // Hardcoded params
      expect(requestArgs.method).to.equal('POST')
      expect(requestArgs.url).to.equal('https://api.goabout.com/plan')
      expect(requestArgs.body).to.equal(v.fakeRequestBody)
    })

    it('should make successful POST request to GoAbout (using сustom res)', function* () {
      v.customRes = {
        '_links': {
          'self': {
            'href': 'https://api.goabout.com/booking/123'
          }
        }
      }

      v.request.send = sandbox.stub().resolves(v.successResponse)

      yield v.GoAbout.request({
        resource: v.customRes,
        method: 'POST',
        relation: 'self',
        token: v.fakeToken,
        body: v.fakeRequestBody
      })

      // Call args of request
      const requestArgs = v.request.send.getCall(0).args[0]

      // Hardcoded params
      expect(requestArgs.method).to.equal('POST')
      expect(requestArgs.url).to.equal('https://api.goabout.com/booking/123')
      expect(requestArgs.body).to.equal(v.fakeRequestBody)
    })

    it('should trim query params from the url template', function* () {
      v.request.send = sandbox.stub().resolves(v.successResponse)

      yield v.GoAbout.request({
        method: 'GET',
        relation: 'http://rels.goabout.com/geocoder',
        token: v.fakeToken
      })

      // Call args of request
      const requestArgs = v.request.send.getCall(0).args[0]

      // Hardcoded params
      expect(requestArgs.method).to.equal('GET')
      expect(requestArgs.url).to.equal('https://api.goabout.com/geocoder/encode')
    })

    it('should omit extra stuff in the returned answer', function* () {
      v.request.send = sandbox.stub().resolves(v.successResponse)

      const result = yield v.GoAbout.request({
        method: 'GET',
        relation: 'http://rels.goabout.com/plan',
        token: v.fakeToken
      })

      expect(result.body).to.equal(v.successResponse.body)
      expect(result.headers).to.equal(v.successResponse.headers)
      expect(result.statusCode).to.equal(v.successResponse.statusCode)
      expect(result.halBody).to.equal(v.successResponse.halBody)
      expect(result.somethingExtra).to.equal(undefined)
    })

    it('should reject if request failed because of non-technical reasons', function* () {
      v.request.send = sandbox.stub().resolves(v.errorResponse)

      try {
        yield v.GoAbout.request({
          method: 'GET',
          relation: 'http://rels.goabout.com/plan',
          token: v.fakeToken
        })

        expect(false).to.equal(true) // Never called
      } catch (error) {
        expect(error.status).to.equal(400)
        expect(error.message).to.equal('E_UNKNOWN_ERROR')
        expect(error.details).to.equal(v.errorResponse.body.message)
      }
    })

    it('should reject if request to Ovelo itself failed and report to Raven (aka 500s and timeouts)', function* () {
      v.request.send = sandbox.stub().rejects()

      try {
        yield v.GoAbout.request({
          method: 'GET',
          relation: 'http://rels.goabout.com/plan',
          token: v.fakeToken
        })

        expect(false).to.equal(true) // Never called
      } catch (error) {
        expect(error.status).to.equal(500)
        expect(error.message).to.equal('E_GOABOUT_API_IS_DOWN')
      }
    })
  })
})
