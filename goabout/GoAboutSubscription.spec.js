const GoAboutProduct = require('./GoAboutProduct')
const GoAboutSubscription = require('./GoAboutSubscription')
const HALResource = require('../utils/HALResource')
const _ = require('lodash')

describe('GoAboutSubscription', () => {
  beforeEach(function* () {
    t.fakeSubscription = {
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
        },
        'http://rels.goabout.com/applicable-products': {
          href: fake.url
        }
      }
    }

    t.fakeProducts = {
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

    t.fakeGoAbout = {
      $Env: { something: fake.string },
      $Errors: { something: fake.string },
      $Log: { something: fake.string },
      $Raven: { something: fake.string },
      request: sandbox.stub().resolves({ halBody: new HALResource(t.fakeProducts) })
    }

    t.subscription = new GoAboutSubscription(t.fakeProduct, t.fakeGoAbout)
  })

  describe('initialization', () => {
    it('should initialize object with all passed properties', function* () {
      assert.equal(t.subscription.name, t.fakeProduct.name)
      assert.equal(t.subscription.logoHref, t.fakeProduct.logoHref)

      assert.deepEqual(t.subscription.applicableProducts, [])
    })

    it('should initialize object and still keep hal methods', function* () {
      assert.equal(t.subscription.getLink('self').href, t.fakeProduct._links.self.href)
    })

    it('should initialize object fine if properties already have HAL methods', function* () {
      t.subscription = new GoAboutProduct(new HALResource(t.fakeProduct), t.fakeGoAbout)

      assert.equal(t.subscription.getLink('self').href, t.fakeProduct._links.self.href)
    })

    it('should initialize object and set GoAbout properties in order to use GoAbout methods', function* () {
      assert.equal(t.subscription.$GoAbout, t.fakeGoAbout)
      assert.equal(t.subscription.$Env, t.fakeGoAbout.$Env)
      assert.equal(t.subscription.$Raven, t.fakeGoAbout.$Raven)
      assert.equal(t.subscription.$Log, t.fakeGoAbout.$Log)
      assert.equal(t.subscription.$Errors, t.fakeGoAbout.$Errors)
    })
  })

  describe('getApplicableProducts', () => {
    it('should call for applicable products', function* () {
      t.receivedProducts = yield t.subscription.getApplicableProducts()

      t.callArgs = t.fakeGoAbout.request.getCall(0).args[0]
      assert.equal(t.callArgs.resource, t.subscription)
      assert.equal(t.callArgs.relation, 'http://rels.goabout.com/applicable-products')

      assert.deepEqual(t.receivedProducts, new HALResource(t.fakeProducts).getEmbeds('http://rels.goabout.com/product'))
    })

    it('should append products to product resource', function* () {
      t.receivedProducts = yield t.subscription.getApplicableProducts()

      assert.deepEqual(t.subscription.applicableProducts, new HALResource(t.fakeProducts).getEmbeds('http://rels.goabout.com/product'))
    })

    it('should not call for applicable products when products already received', function* () {
      t.halifiedProducts = new HALResource(t.fakeProducts)
      t.subscription.applicableProducts = t.halifiedProducts.getEmbeds('http://rels.goabout.com/product')

      t.receivedProducts = yield t.subscription.getApplicableProducts()

      assert.equal(t.fakeGoAbout.request.called, false)

      assert.deepEqual(t.receivedProducts, new HALResource(t.fakeProducts).getEmbeds('http://rels.goabout.com/product'))
    })
  })

  describe('getApplicableProduct', () => {
    beforeEach(() => {
      t.halifiedProducts = new HALResource(t.fakeProducts)
      t.subscription.applicableProducts = t.halifiedProducts.getEmbeds('http://rels.goabout.com/product')
      t.href = t.subscription.applicableProducts[1].getLink('self').href

      t.subscription.getApplicableProducts = sandbox.stub().resolves()
      t.fakeGoAbout.generateProductHref = sandbox.stub().resolves(t.href)
    })

    it('should get one applicable product from the list', function* () {
      t.result = yield t.subscription.getApplicableProduct({ productHref: t.href })
      assert.deepEqual(t.result, t.subscription.applicableProducts[1])
      assert.equal(t.subscription.getApplicableProducts.called, false)
    })

    it('should return null when product does not exist', function* () {
      t.result = yield t.subscription.getApplicableProduct({ productHref: fake.url })
      assert.deepEqual(t.result, null)
    })

    it('should construct a href if only an id is specified', function* () {
      t.id = fake.integer()
      t.result = yield t.subscription.getApplicableProduct({ productId: t.id })

      t.callArgs = t.fakeGoAbout.generateProductHref.getCall(0).args
      assert.equal(t.id, t.callArgs[0])

      assert.deepEqual(t.result, t.subscription.applicableProducts[1])
    })

    it('should not call getApplicableProducts if products array is not empty', function* () {
      t.result = yield t.subscription.getApplicableProduct({ productHref: fake.url })
      assert.equal(t.subscription.getApplicableProducts.called, false)
    })

    it('should call getApplicableProducts if products array is empty', function* () {
      t.subscription.applicableProducts = []

      t.result = yield t.subscription.getApplicableProduct({ productHref: fake.url })
      assert.equal(t.subscription.getApplicableProducts.called, true)

      assert.deepEqual(t.result, t.subscription.applicableProducts[1])
    })
  })

  describe('toSanitizedHal', () => {
    it('should keep the right props', () => {
      t.result = t.subscription.getSanitizedHal()

      assert.deepEqual(Object.keys(t.result), ['name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail'])
    })

    it('should avoid extra props', () => {
      t.result = t.subscription.getSanitizedHal()

      assert.equal(t.result.extraProperty, undefined)
      assert.equal(t.result._links, undefined)
    })

    it('should return applicableProducts as well', () => {
      t.halifiedProducts = new HALResource(t.fakeProducts)
      t.subscription.applicableProducts = t.halifiedProducts.getEmbeds('http://rels.goabout.com/product')
      t.result = t.subscription.getSanitizedHal()

      assert.equal(t.result.getEmbeds('products').length, 2)

      t.firstProduct = t.fakeProducts._embedded['http://rels.goabout.com/product'][0]

      assert.deepEqual(t.result.getEmbeds('products')[0], _.omit(t.firstProduct, ['extraProperty', '_links']))
    })

    it('should return empty array if no applicable-products found', () => {
      t.result = t.subscription.getSanitizedHal()
      assert.equal(t.result.getEmbeds('products').length, 0)
    })
  })
})
