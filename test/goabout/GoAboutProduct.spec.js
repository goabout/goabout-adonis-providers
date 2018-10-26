const GoAboutProduct = require('../../goabout/GoAboutProduct')
const HALResource = require('../../utils/HALResource')

describe('GoAboutProduct', () => {
  beforeEach(async () => {
    this.fakeProduct = {
      name: fake.name,
      logoHref: fake.url,
      moreInfoHref: fake.url,
      description: fake.sentence,
      extendedDescription: fake.sentence,
      categories: fake.array,
      supportEmail: fake.email,
      extraProperty: fake.sentence,
      _links: {
        self: {
          href: fake.url
        }
      }
    }

    this.fakeGoAbout = {
      $Env: { something: fake.string },
      $Errors: { something: fake.string },
      $Log: { something: fake.string },
      $Raven: { something: fake.string },
      $HALResource: HALResource,
      getResourceId: sandbox.stub().returns(fake.uuid)
    }

    this.product = new GoAboutProduct(this.fakeProduct, this.fakeGoAbout)
  })

  describe('initialization', () => {
    it('should initialize object with all passed properties', async () => {
      assert.equal(this.product.name, this.fakeProduct.name)
      assert.equal(this.product.logoHref, this.fakeProduct.logoHref)
    })

    it('should initialize object and still keep hal methods', async () => {
      assert.equal(this.product.getLink('self'), this.fakeProduct._links.self.href)
    })

    it('should initialize object fine if properties already have HALResource methods', async () => {
      this.product = new GoAboutProduct(new HALResource(this.fakeProduct), this.fakeGoAbout)

      assert.equal(this.product.getLink('self'), this.fakeProduct._links.self.href)
    })

    it('should initialize object and set GoAbout properties in order to use GoAbout methods', async () => {
      assert.equal(this.product.$GoAbout, this.fakeGoAbout)
      assert.equal(this.product.$Env, this.fakeGoAbout.$Env)
      assert.equal(this.product.$Raven, this.fakeGoAbout.$Raven)
      assert.equal(this.product.$Log, this.fakeGoAbout.$Log)
      assert.equal(this.product.$Errors, this.fakeGoAbout.$Errors)
    })
  })

  describe('toSanitizedHal', () => {
    it('should keep the right props', () => {
      this.result = this.product.toSanitizedHal()

      assert.deepEqual(Object.keys(this.result), ['id', 'name', 'logoHref', 'moreInfoHref', 'description', 'extendedDescription', 'categories', 'supportEmail', '_links'])
    })

    it('should avoid extra props', () => {
      this.result = this.product.toSanitizedHal()

      assert.equal(this.result.extraProperty, undefined)
    })
  })
})
