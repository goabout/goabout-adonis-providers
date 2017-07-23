const GoAbout = require('../../providers/GoAbout').bare()
const halson = require('halson')
const { Env } = require('adonis-sink')

describe('GoAboutService', () => {
  beforeEach(function* () {
    t.token = fake.word
    t.method = 'GET'
    t.goAboutApi = fake.url
    t.Env = new Env()
    t.Env.set('GOABOUT_API', t.goAboutApi)


    t.goAboutRootApi = halson({
      _embedded: {
        'http://rels.goabout.com/authenticated-user': {
          email: t.email,
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
      },
      '_links': {
        'http://rels.goabout.com/geocoder': {
          'href': 'https://api.goabout.com/geocoder{?query,count,types,extratypes,tags}',
          'templated': true
        },
        'http://rels.goabout.com/plan': {
          'href': 'https://api.goabout.com/plan'
        }
      }
    })

    t.goAboutUser = t.goAboutRootApi.getEmbed('http://rels.goabout.com/authenticated-user')

    t.Request = { send: sandbox.stub() }

    t.GoAbout = new GoAbout(t.Request, t.Env, t.Errors, t.Log, t.Raven)
  })

  describe('request', () => {
    beforeEach(() => {
      t.url = fake.url
      t.geocoderRelation = 'http://rels.goabout.com/geocoder'
      t.planRelation = 'http://rels.goabout.com/plan'
      t.query = { 'some-query-key': fake.word }

      t.requestBody = { 'some-body-key': fake.word }

      t.successResponse = {
        statusCode: 200,
        headers: { 'some-header': fake.word },
        body: { item: fake.word },
        halBody: { halProp: fake.word },
      }

      sandbox.stub(t.GoAbout, 'getApi').resolves(t.goAboutRootApi)
      t.Request.send.resolves(t.successResponse)
    })

    it('should make a successful request to GoAbout relation (using root api res)', function* () {
      t.result = yield t.GoAbout.request({
        method: t.method,
        relation: t.geocoderRelation,
        token: t.token,
        query: t.query
      })

      // Call args of request
      const requestArgs = t.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, 'GET')
      assert.equal(requestArgs.url, 'https://api.goabout.com/geocoder')
      assert.equal(requestArgs.query, t.query)
      assert.equal(requestArgs.token, t.token)

      // Get response
      assert.equal(t.result, t.successResponse)
    })

    it('should make successful POST request to GoAbout (using root api res)', function* () {
      t.Request.send = sandbox.stub().resolves(t.successResponse)

      yield t.GoAbout.request({
        method: 'POST',
        relation: t.planRelation,
        token: t.token,
        body: t.requestBody
      })

      // Call args of request
      const requestArgs = t.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, 'POST')
      assert.equal(requestArgs.url, 'https://api.goabout.com/plan')
      assert.equal(requestArgs.body, t.requestBody)
    })

    it('should make successful POST request to GoAbout (using сustom res)', function* () {
      t.customRes = {
        '_links': {
          'self': {
            'href': 'https://api.goabout.com/booking/123'
          }
        }
      }

      t.Request.send = sandbox.stub().resolves(t.successResponse)

      yield t.GoAbout.request({
        resource: t.customRes,
        method: 'POST',
        relation: 'self',
        token: t.token,
        body: t.requestBody
      })

      // Call args of request
      const requestArgs = t.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, 'POST')
      assert.equal(requestArgs.url, 'https://api.goabout.com/booking/123')
      assert.equal(requestArgs.body, t.requestBody)
    })

    it('should trim query params from the url template', function* () {
      t.Request.send = sandbox.stub().resolves(t.successResponse)

      yield t.GoAbout.request({
        relation: 'http://rels.goabout.com/geocoder'
      })

      // Call args of request
      const requestArgs = t.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.url, 'https://api.goabout.com/geocoder')
    })

    it('should pass rejection through', function* () {
      t.error = new t.Errors.PassThrough()
      t.Request.send = sandbox.stub().rejects(t.error)

      try {
        yield t.GoAbout.request({
          relation: 'http://rels.goabout.com/plan',
        })
      } catch (error) {
        t.passedError = error
      }

      assert.equal(t.passedError, t.error)
    })
  })

  describe('getApi', () => {
    it('should get API', function* () {
      t.Request.send = sandbox.stub().resolves({ halBody: t.goAboutRootApi })

      t.result = yield t.GoAbout.getApi({ token: t.token })

      // Call args of request
      const requestArgs = t.Request.send.getCall(0).args[0]
      assert.equal(requestArgs.url, t.goAboutApi)
      assert.equal(requestArgs.token, t.token)

      assert.deepEqual(t.result, t.goAboutRootApi)
    })

    it('should return whatever failed there', function* () {
      t.Request.send = sandbox.stub().rejects(new t.Errors.PassThrough(403))

      try {
        yield t.GoAbout.getApi({ token: t.token })
      } catch (error) {
        t.error = error
      }

      assert.equal(t.error.status, 403)
    })
  })

  describe('getUser', () => {
    it('should get user', function* () {
      t.GoAbout.getApi = sandbox.stub().resolves(t.goAboutRootApi)

      t.result = yield t.GoAbout.getUser({ token: t.token })

      // Call args of request
      const requestArgs = t.GoAbout.getApi.getCall(0).args[0]
      assert.equal(requestArgs.token, t.token)

      assert.deepEqual(t.result, t.goAboutUser)
    })

    it('should return whatever failed there', function* () {
      t.GoAbout.getApi = sandbox.stub().rejects(new t.Errors.PassThrough(403))

      try {
        yield t.GoAbout.getUser({ token: t.token })
      } catch (error) {
        t.error = error
      }

      assert.equal(t.error.status, 403)
    })
  })

  describe('getUserSubscriptions', () => {
    beforeEach(() => {
      t.userSubscriptions = {
        halBody: halson({
          '_embedded': {
            'item': [
              {
                name: fake.name,
              },
              {
                name: fake.name,
              }
            ]
          }
        })
      }
    })

    it('should get user', function* () {
      t.GoAbout.getUser = sandbox.stub().resolves(t.goAboutUser)
      t.GoAbout.request = sandbox.stub().resolves(t.userSubscriptions)
      t.GoAbout.fillSubscriptionsWithIds = sandbox.stub()

      t.result = yield t.GoAbout.getUserSubscriptions({ token: t.token })

      // Call args of request
      const userRequestArgs = t.GoAbout.getUser.getCall(0).args[0]
      assert.equal(userRequestArgs.token, t.token)

      // Call args of request
      const requestArgs = t.GoAbout.request.getCall(0).args[0]
      assert.equal(requestArgs.token, t.token)
      assert.equal(requestArgs.resource, t.goAboutUser)
      assert.equal(requestArgs.relation, 'http://rels.goabout.com/subscriptions')

      assert.deepEqual(t.result, halson(t.userSubscriptions.halBody._embedded.item))
    })

    it.only('should return whatever failed there', function* () {
      t.GoAbout.getUser = sandbox.stub().resolves(t.goAboutUser)
      t.GoAbout.request = sandbox.stub().rejects(new t.Errors.PassThrough(400))

      try {
        yield t.GoAbout.getUserSubscriptions({ token: t.token })
      } catch (error) {
        t.error = error
      }

      assert.equal(t.error.status, 400)
    })
  })
})
