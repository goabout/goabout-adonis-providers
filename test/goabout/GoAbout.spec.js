const GoAbout = require('../../goabout/GoAbout')
const GoAboutSubscription = require('../../goabout/GoAboutSubscription')
const HALResource = require('../../utils/HALResource')
const { Env } = require('@adonisjs/sink')

describe('GoAbout', () => {
  beforeEach(async () => {
    this.token = fake.word
    this.method = 'GET'
    this.goAboutApi = fake.url
    this.Env = new Env()
    this.Env.set('GOABOUT_API', this.goAboutApi)

    this.goAboutRootApi = new HALResource({
      _embedded: {
        'http://rels.goabout.com/authenticated-user': {
          email: this.email,
          identifier: 'goabout-identifier',
          validated: true,
          name: 'Vasya',
          phonenumber: '342342',
          properties: {
            breastSize: 3,
            politicalViews: 'Kommunist',
            vegeterian: true
          },
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

    this.goAboutUser = this.goAboutRootApi.getEmbed('http://rels.goabout.com/authenticated-user')

    this.Request = { send: sandbox.stub() }

    this.GoAbout = new GoAbout({
      Request: this.Request,
      Env: this.Env,
      Errors: config.Errors,
      Log: config.Log,
      Raven: config.Raven,
      HALResource,
    })
    this.GoAbout.token = this.token
  })

  describe('request', () => {
    beforeEach(() => {
      this.url = fake.url
      this.geocoderRelation = 'http://rels.goabout.com/geocoder'
      this.planRelation = 'http://rels.goabout.com/plan'
      this.query = { 'some-query-key': fake.word }

      this.requestBody = { 'some-body-key': fake.word }

      this.successResponse = {
        statusCode: 200,
        headers: { 'some-header': fake.word },
        body: { item: fake.word },
        halBody: { halProp: fake.word },
      }

      sandbox.stub(this.GoAbout, 'getRoot').resolves(this.goAboutRootApi)
      this.Request.send.resolves(this.successResponse)
    })

    it('should make a successful request to GoAbout relation (using root api res)', async () => {
      this.result = await this.GoAbout.request({
        method: this.method,
        relation: this.geocoderRelation,
        query: this.query
      })

      // Call args of request
      const requestArgs = this.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, 'GET')
      assert.equal(requestArgs.url, 'https://api.goabout.com/geocoder')
      assert.equal(requestArgs.query, this.query)
      assert.equal(requestArgs.token, this.token)

      // Get response
      assert.equal(this.result, this.successResponse)
    })

    it('should make successful POST request to GoAbout (using root api res)', async () => {
      this.Request.send = sandbox.stub().resolves(this.successResponse)

      await this.GoAbout.request({
        method: 'POST',
        relation: this.planRelation,
        body: this.requestBody
      })

      // Call args of request
      const requestArgs = this.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, 'POST')
      assert.equal(requestArgs.url, 'https://api.goabout.com/plan')
      assert.equal(requestArgs.body, this.requestBody)
    })

    it('should make successful POST request to GoAbout (using сustom res)', async () => {
      this.customRes = {
        '_links': {
          'self': {
            'href': 'https://api.goabout.com/booking/123'
          }
        }
      }

      this.Request.send = sandbox.stub().resolves(this.successResponse)

      await this.GoAbout.request({
        resource: this.customRes,
        method: 'POST',
        relation: 'self',
        body: this.requestBody
      })

      // Call args of request
      const requestArgs = this.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.method, 'POST')
      assert.equal(requestArgs.url, 'https://api.goabout.com/booking/123')
      assert.equal(requestArgs.body, this.requestBody)
    })

    it('should trim query params from the url template', async () => {
      this.Request.send = sandbox.stub().resolves(this.successResponse)

      await this.GoAbout.request({
        relation: 'http://rels.goabout.com/geocoder'
      })

      // Call args of request
      const requestArgs = this.Request.send.getCall(0).args[0]

      // Hardcoded params
      assert.equal(requestArgs.url, 'https://api.goabout.com/geocoder')
    })

    it('should pass rejection through', async () => {
      this.error = new config.Errors.PassThrough()
      this.Request.send = sandbox.stub().rejects(this.error)

      try {
        await this.GoAbout.request({
          relation: 'http://rels.goabout.com/plan',
        })
      } catch (error) {
        this.passedError = error
      }

      assert.equal(this.passedError, this.error)
    })
  })

  describe('getRoot', () => {
    it('should get API', async () => {
      this.Request.send = sandbox.stub().resolves({ halBody: this.goAboutRootApi })

      this.result = await this.GoAbout.getRoot()

      // Call args of request
      const requestArgs = this.Request.send.getCall(0).args[0]
      assert.equal(requestArgs.url, this.goAboutApi)
      assert.equal(requestArgs.token, this.token)

      assert.deepEqual(this.result, this.goAboutRootApi)
    })

    it('should return whatever failed there', async () => {
      this.Request.send = sandbox.stub().rejects(new config.Errors.Denied())

      try {
        await this.GoAbout.getRoot()
      } catch (error) {
        this.error = error
      }

      assert.equal(this.error.status, 403)
    })
  })

  describe('getUser', () => {
    it('should get user', async () => {
      this.GoAbout.getRoot = sandbox.stub().resolves(this.goAboutRootApi)

      this.result = await this.GoAbout.getUser()

      assert.deepEqual(this.result, this.goAboutUser)
    })

    it('should return whatever failed there', async () => {
      this.GoAbout.getRoot = sandbox.stub().rejects(new config.Errors.Denied())

      try {
        await this.GoAbout.getUser()
      } catch (error) {
        this.error = error
      }

      assert.equal(this.error.status, 403)
    })
  })

  describe('getUserSubscriptions', () => {
    beforeEach(() => {
      this.realSubscriptionName = fake.name

      this.userSubscriptions = {
        halBody: new HALResource({
          '_embedded': {
            'item': [
              {
                _links: {
                  'self': {
                    href: 'subscription-href'
                  }
                },
                _embedded: {
                  'http://rels.goabout.com/product': {
                    name: fake.name,
                    isSubscription: false,
                    _links: {}
                  }
                }
              },
              {
                _links: {
                  'self': {
                    href: 'subscription-href'
                  }
                },
                _embedded: {
                  'http://rels.goabout.com/product': {
                    name: this.realSubscriptionName,
                    isSubscription: true,
                    _links: {}
                  }
                }
              },
              // Faulty res
              {
                somethingElse: true
              }
            ]
          }
        })
      }

      sandbox.stub(this.GoAbout, 'getResourceId').returns(fake.uuid)
    })

    it('should get user subscriptions', async () => {
      this.GoAbout.getUser = sandbox.stub().resolves(this.goAboutUser)
      this.GoAbout.request = sandbox.stub().resolves(this.userSubscriptions)
      this.GoAbout.fillSubscriptionsWithIds = sandbox.stub()

      this.result = await this.GoAbout.getUserSubscriptions()

      // Call args of request
      const requestArgs = this.GoAbout.request.getCall(0).args[0]
      assert.equal(requestArgs.resource, this.goAboutUser)
      assert.equal(requestArgs.relation, 'http://rels.goabout.com/subscriptions')


      assert.equal(this.result.length, 1)
      assert.equal(this.result[0].name, this.realSubscriptionName)
      assert.equal(this.result[0]._links.subscription.href, 'subscription-href')

      assert(this.result[0] instanceof GoAboutSubscription)

      // assert.deepEqual (this.result, halson (this.userSubscriptions.halBody._embedded.item)) //eslint-disable-line
    })

    it('should return whatever failed there', async () => {
      this.GoAbout.getUser = sandbox.stub().resolves(this.goAboutUser)
      this.GoAbout.request = sandbox.stub().rejects(new config.Errors.BadRequest())

      try {
        await this.GoAbout.getUserSubscriptions()
      } catch (error) {
        this.error = error
      }

      assert.equal(this.error.status, 400)
    })
  })

  describe('getUserProperties', () => {
    beforeEach(() => {
      sandbox.stub(this.GoAbout, 'getRoot').resolves(this.goAboutRootApi)
      sandbox.stub(this.GoAbout, 'request').resolves({ halBody: new HALResource({
        name: 'Vasya',
        phonenumber: '342342',
        properties: {
          breastSize: 3
        }
      })
      })
    })

    it('should get user properties', async () => {
      const result = await this.GoAbout.getUserProperties()
      assert.equal(result.name, 'Vasya')
      assert.equal(result.phonenumber, '342342')
      assert.equal(result.breastSize, 3)

      const reqArgs = this.GoAbout.request.getCall(0).args[0]

      assert.equal(reqArgs.relation, 'self')
      assert.equal(reqArgs.resource, this.goAboutRootApi.getEmbed('http://rels.goabout.com/authenticated-user'))
      assert.equal(reqArgs.useCache, false)
      assert.equal(reqArgs.useSupertoken, true)
    })
  })

  describe('setUserProperties', () => {
    beforeEach(() => {
      sandbox.stub(this.GoAbout, 'getRoot').resolves(this.goAboutRootApi)
      sandbox.stub(this.GoAbout, 'getUserProperties').resolves({
        name: 'Vasya',
        phonenumber: '342342',
        breastSize: 3,
        politicalViews: 'Kommunist',
        vegeterian: true
      })
      sandbox.stub(this.GoAbout, 'request').resolves(true)

      this.newUserProps = {
        breastSize: 3,
        vegeterian: false,
        firstName: 'Eric',
        lastName: 'Cartman',
        phonenumber: '123456'
      }
    })

    it('should update props', async () => {
      await this.GoAbout.setUserProperties({ properties: this.newUserProps })

      const requestCall = this.GoAbout.request.getCall(0).args[0]
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestCall.method, 'PUT')
      assert.equal(requestCall.relation, 'self')
      assert.equal(requestBody.properties.breastSize, 3)
    })

    it('should keep untouched props', async () => {
      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.properties.politicalViews, 'Kommunist')
    })

    it('should remove props', async () => {
      this.newUserProps.politicalViews = null

      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.properties.politicalViews, null)
    })

    it('should set name out of first and last names', async () => {
      this.newUserProps.politicalViews = null

      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.name, 'Eric Cartman')
    })

    it('should update phonenumber and remove it from general props', async () => {
      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.phonenumber, '123456')
      assert.equal(requestBody.properties.phonenumber, undefined)
    })

    it('should update name and remove it from general props', async () => {
      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.name, 'Eric Cartman')
      assert.equal(requestBody.properties.name, undefined)
    })

    it('should not use name prop if first&last name are set', async () => {
      this.newUserProps.name = 'blabla'

      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.name, 'Eric Cartman')
      assert.equal(requestBody.properties.name, undefined)
    })

    it('should  use name prop if first&last name are not set', async () => {
      this.newUserProps.name = 'blabla'
      delete this.newUserProps.firstName

      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.name, 'blabla')
      assert.equal(requestBody.properties.name, undefined)
    })

    it('should not update email and remove it from general props', async () => {
      this.newUserProps.email = 'blabla@xtc.vc'

      await this.GoAbout.setUserProperties({ properties: this.newUserProps })
      const requestBody = this.GoAbout.request.getCall(0).args[0].body

      assert.equal(requestBody.email, undefined)
      assert.equal(requestBody.properties.email, undefined)
    })
  })

  describe('getBooking', () => {
    beforeEach(() => {
      this.bookingUrl = fake.url
      this.id = fake.uuid

      this.booking = {
        halBody: new HALResource({
          '_embedded': {
            'item': [
              {
                name: fake.name,
                _links: {
                  'http://rels.goabout.com/booking-events': {
                    href: fake.url
                  }
                }
              },
              {
                name: fake.name,
                _links: {
                  'http://rels.goabout.com/booking-events': {
                    href: fake.url
                  }
                }
              }
            ]
          }
        })
      }

      sandbox.stub(this.GoAbout, 'getResourceId').returns(this.id)
    })

    it('should get booking', async () => {
      this.Request.send = sandbox.stub().resolves(this.booking)
      this.bookingInstance = new this.GoAbout.Booking(this.booking.halBody, this.GoAbout)

      this.result = await this.GoAbout.getBooking({
        url: this.bookingUrl
      })

      // Call args of request
      const requestArgs = this.Request.send.getCall(0).args[0]
      assert.equal(requestArgs.url, this.bookingUrl)
      assert.equal(requestArgs.token, this.token)


      assert.deepEqual(this.result, this.bookingInstance)
    })

    it('should return whatever failed there', async () => {
      this.Request.send = sandbox.stub().rejects(new config.Errors.PassThrough())

      try {
        await this.GoAbout.getBooking({
          url: this.bookingUrl
        })
      } catch (error) {
        this.error = error
      }

      assert.equal(this.error.status, 500)
    })

    // For unfinished bookings
    // this.unfinishedBookings = {
    //   halBody: halson({
    //     '_embedded': {
    //       'item': [
    //         {
    //           name: fake.name,
    //           _links: {
    //             'http://rels.goabout.com/booking-events': {
    //               href: fake.url
    //             }
    //           }
    //         },
    //         {
    //           name: fake.name,
    //           _links: {
    //             'http://rels.goabout.com/booking-events': {
    //               href: fake.url
    //             }
    //           }
    //         }
    //       ]
    //     }
    //   })
    // }
  })
})
