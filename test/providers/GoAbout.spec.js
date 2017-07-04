const GoAbout = require('../../providers/GoAbout').bare()
const Errors = require('../../providers/Errors').bare()

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

    v.GoAbout = new GoAbout(v.request, v.Env, Errors, v.log)
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
})
