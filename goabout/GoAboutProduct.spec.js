const GoAboutProduct = require('./GoAboutProduct')
const HALResource = require('../utils/HALResource')

describe('GoAboutProduct', () => {
  beforeEach(function* () {
    t.fakeProduct = {
      name: fake.name,
      logoHref: fake.href,
      moreInfoHref: fake.href,
      description: fake.sentence,
      categories: fake.array,
      supportEmail: fake.email,
      extraProperty: fake.sentence,
      _links: {
        self: {
          href: fake.href
        }
      }
    }

    t.fakeGoAbout = {
      $Env: { something: fake.string },
      $Errors: { something: fake.string },
      $Log: { something: fake.string },
      $Raven: { something: fake.string },
      getResourceId: sandbox.stub().returns(fake.uuid)
    }

    t.product = new GoAboutProduct(t.fakeProduct, t.fakeGoAbout)
  })

  describe('initialization', () => {
    it('should initialize object with all passed properties', function* () {
      assert.equal(t.product.name, t.fakeProduct.name)
      assert.equal(t.product.logoHref, t.fakeProduct.logoHref)
    })

    it('should initialize object and still keep hal methods', function* () {
      assert.equal(t.product.getLink('self').href, t.fakeProduct._links.self.href)
    })

    it('should initialize object fine if properties already have HALResource methods', function* () {
      t.product = new GoAboutProduct(new HALResource(t.fakeProduct), t.fakeGoAbout)

      assert.equal(t.product.getLink('self').href, t.fakeProduct._links.self.href)
    })

    it('should initialize object and set GoAbout properties in order to use GoAbout methods', function* () {
      assert.equal(t.product.$GoAbout, t.fakeGoAbout)
      assert.equal(t.product.$Env, t.fakeGoAbout.$Env)
      assert.equal(t.product.$Raven, t.fakeGoAbout.$Raven)
      assert.equal(t.product.$Log, t.fakeGoAbout.$Log)
      assert.equal(t.product.$Errors, t.fakeGoAbout.$Errors)
    })
  })

  describe('toSanitizedHal', () => {
    it('should keep the right props', () => {
      t.result = t.product.getSanitizedHal()

      assert.deepEqual(Object.keys(t.result), ['id', 'name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail'])
    })

    it('should avoid extra props', () => {
      t.result = t.product.getSanitizedHal()

      assert.equal(t.result.extraProperty, undefined)
      assert.equal(t.result._links, undefined)
    })
  })
})
