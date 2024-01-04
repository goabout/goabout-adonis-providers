const GoAboutProduct = require('../../goabout/GoAboutProduct')
const GoAboutSubscription = require('../../goabout/GoAboutSubscription')
const HALResource = require('../../utils/HALResource')

describe.skip('GoAboutSubscription', () => {
  beforeEach(async () => {
    this.fakeId = fake.uuid

    this.fakeSubscription = {
      name: fake.name,
      logoHref: fake.url,
      moreInfoHref: fake.url,
      description: fake.sentence,
      categories: fake.array_of_words(),
      supportEmail: fake.email,
      validFrom: fake.moment.toISOString(),
      validUntil: fake.moment.toISOString(),
      extraProperty: fake.sentence,
      _links: {
        self: {
          href: fake.url
        },
        'http://rels.goabout.com/applicable-products': {
          href: fake.url
        }
      }
    }

    this.fakeProducts = {
      _embedded: {
        'http://rels.goabout.com/product': [{
          name: fake.name,
          logoHref: fake.url,
          moreInfoHref: fake.url,
          description: fake.sentence,
          categories: fake.array_of_words(),
          supportEmail: fake.email,
          extraProperty: fake.sentence,
          _links: {
            self: {
              href: fake.url
            }
          }
        }, {
          name: fake.name,
          logoHref: fake.url,
          moreInfoHref: fake.url,
          description: fake.sentence,
          categories: fake.array_of_words(),
          supportEmail: fake.email,
          extraProperty: fake.sentence,
          _links: {
            self: {
              href: fake.url
            }
          }
        }]
      }
    }

    this.fakeGoAbout = {
      $Env: { something: fake.string },
      $Errors: { something: fake.string },
      $Log: { something: fake.string },
      $Raven: { something: fake.string },
      request: sandbox.stub().resolves({ halBody: new HALResource(this.fakeProducts) }),
      $HALResource: HALResource,
      getResourceId: sandbox.stub().returns(this.fakeId)
    }

    this.subscription = new GoAboutSubscription(this.fakeSubscription, null, this.fakeGoAbout)
  })

  describe('initialization', () => {
    it('should initialize object with all passed properties', async () => {
      assert.equal(this.subscription.name, this.fakeSubscription.name)
      assert.equal(this.subscription.logoHref, this.fakeSubscription.logoHref)

      assert.deepEqual(this.subscription.applicableProducts, [])
    })

    it('should initialize object and still keep hal methods', async () => {
      assert.equal(this.subscription.getLink('self'), this.fakeSubscription._links.self.href)
    })

    it('should initialize object fine if properties already have HAL methods', async () => {
      this.subscription = new GoAboutProduct(new HALResource(this.fakeSubscription), this.fakeGoAbout)

      assert.equal(this.subscription.getLink('self'), this.fakeSubscription._links.self.href)
    })

    it('should initialize object and set GoAbout properties in order to use GoAbout methods', async () => {
      assert.equal(this.subscription.$GoAbout, this.fakeGoAbout)
      assert.equal(this.subscription.$Env, this.fakeGoAbout.$Env)
      assert.equal(this.subscription.$Raven, this.fakeGoAbout.$Raven)
      assert.equal(this.subscription.$Log, this.fakeGoAbout.$Log)
      assert.equal(this.subscription.$Errors, this.fakeGoAbout.$Errors)
    })
  })

  describe('getApplicableProducts', () => {
    it.skip('should call for applicable products', async () => {
      this.receivedProducts = await this.subscription.getApplicableProducts()

      this.callArgs = this.fakeGoAbout.request.getCall(0).args[0]
      assert.equal(this.callArgs.resource, this.subscription)
      assert.equal(this.callArgs.relation, 'http://rels.goabout.com/applicable-products')

      this.fakeProductsEmbeds = new HALResource(this.fakeProducts).getEmbeds('http://rels.goabout.com/product')
      this.fakeProductsEmbeds[0].id = this.fakeId
      this.fakeProductsEmbeds[1].id = this.fakeId

      assert.deepEqual(this.receivedProducts, this.fakeProductsEmbeds)
    })

    it.skip('should append products to product resource', async () => {
      this.receivedProducts = await this.subscription.getApplicableProducts()

      assert.deepEqual(this.subscription.applicableProducts, new HALResource(this.fakeProducts).getEmbeds('http://rels.goabout.com/product'))
    })

    it('should not call for applicable products when products already received', async () => {
      this.halifiedProducts = new HALResource(this.fakeProducts)
      this.subscription.applicableProducts = this.halifiedProducts.getEmbeds('http://rels.goabout.com/product')

      this.receivedProducts = await this.subscription.getApplicableProducts()

      assert.equal(this.fakeGoAbout.request.called, false)

      assert.deepEqual(this.receivedProducts, new HALResource(this.fakeProducts).getEmbeds('http://rels.goabout.com/product'))
    })
  })

  describe('getApplicableProduct', () => {
    beforeEach(() => {
      this.halifiedProducts = new HALResource(this.fakeProducts)
      this.subscription.applicableProducts = this.halifiedProducts.getEmbeds('http://rels.goabout.com/product')
      this.href = this.subscription.applicableProducts[1].getLink('self')

      this.subscription.getApplicableProducts = sandbox.stub().resolves()
      this.fakeGoAbout.generateProductHref = sandbox.stub().resolves(this.href)
    })

    it('should get one applicable product from the list', async () => {
      this.result = await this.subscription.getApplicableProduct({ productHref: this.href })
      assert.deepEqual(this.result, this.subscription.applicableProducts[1])
      assert.equal(this.subscription.getApplicableProducts.called, false)
    })

    it('should return null when product does not exist', async () => {
      this.result = await this.subscription.getApplicableProduct({ productHref: fake.url })
      assert.deepEqual(this.result, null)
    })

    it('should construct a href if only an id is specified', async () => {
      this.id = fake.integer()
      this.result = await this.subscription.getApplicableProduct({ productId: this.id })

      this.callArgs = this.fakeGoAbout.generateProductHref.getCall(0).args
      assert.equal(this.id, this.callArgs[0])

      assert.deepEqual(this.result, this.subscription.applicableProducts[1])
    })

    it('should not call getApplicableProducts if products array is not empty', async () => {
      this.result = await this.subscription.getApplicableProduct({ productHref: fake.url })
      assert.equal(this.subscription.getApplicableProducts.called, false)
    })

    it('should call getApplicableProducts if products array is empty', async () => {
      this.subscription.applicableProducts = []

      this.result = await this.subscription.getApplicableProduct({ productHref: fake.url })
      assert.equal(this.subscription.getApplicableProducts.called, true)

      assert.deepEqual(this.result, this.subscription.applicableProducts[1])
    })
  })

  describe('toSanitizedHal', () => {
    it('should keep the right props', () => {
      this.result = this.subscription.toSanitizedHal()

      assert.deepEqual(Object.keys(this.result), ['id', 'name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail', 'properties', 'validFrom', 'validUntil', '_links'])
    })

    it('should avoid extra props', () => {
      this.result = this.subscription.toSanitizedHal()

      assert.equal(this.result.extraProperty, undefined)
    })

    it('should return applicableProducts as well', () => {
      this.halifiedProducts = new HALResource(this.fakeProducts)
      this.subscription.applicableProducts = this.halifiedProducts.getEmbeds('http://rels.goabout.com/product').map(p => new GoAboutProduct(p, this.fakeGoAbout))
      this.result = this.subscription.toSanitizedHal()

      assert.equal(this.result.getEmbeds('products').length, 2)

      this.firstProduct = this.fakeProducts._embedded['http://rels.goabout.com/product'][0]

      assert.equal(this.result.getEmbeds('products')[0].name, this.firstProduct.name)
    })

    it('should return empty array if no applicable-products found', () => {
      this.result = this.subscription.toSanitizedHal()
      assert.equal(this.result.getEmbeds('products').length, 0)
    })
  })
})
