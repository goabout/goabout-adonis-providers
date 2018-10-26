const HALResourceWithRoutes = require('../../utils/HALResourceWithRoutes')
const Errors = require('../../errors/Errors')

const { Config } = require('@adonisjs/sink')

describe('HALResourceWithRoutes', () => {
  beforeEach(() => {
    this.Config = new Config()

    this.Config.set('hal.templates', {
      SELF: '/myself',
      PRODUCT: '/subscriptions/{subscriptionId}/products/{productId}',
      LOCATION: '{PRODUCT}/locations/{locationId}',
      IS_DEPRECATED_APP: '{DEPRECATED_APPS}/{apps}/{os}/{version}'
    })

    this.CLS = {
      get: key => {
        if (key === 'request.host') return 'test.goabout.com'
        if (key === 'request.protocol') return 'https'
        if (key === 'productId') return 123
        if (key === 'subscriptionId') return '456'
        return undefined
      }
    }

    this.Errors = new Errors()
    sandbox.stub(this.Errors, 'localize').callsFake(message => `localized_${message}`)

    this.providers = {
      CLS: this.CLS,
      Config: this.Config,
      Errors: this.Errors
    }
  })

  describe('addTemplatedLink', () => {
    it('should add templated links within predefined template and no segments to fill', () => {
      const resource = new HALResourceWithRoutes({}, this.providers)

      resource.addTemplatedLink('self', 'SELF')
      assert.equal(resource._links.self.href, 'https://test.goabout.com/myself')
    })

    it('should add templated links within predefined template and with segments to fill', () => {
      const resource = new HALResourceWithRoutes({}, this.providers)

      resource.addTemplatedLink('product', 'PRODUCT')
      assert.equal(resource._links.product.href, 'https://test.goabout.com/subscriptions/456/products/123')
    })

    it('should add templated links within predefined template and with missing segments', () => {
      const resource = new HALResourceWithRoutes({}, this.providers)

      resource.addTemplatedLink('deprecated-apps', 'IS_DEPRECATED_APP', null, { ignoreMissingProps: true })
      assert.equal(resource._links['deprecated-apps'].href, 'https://test.goabout.com{DEPRECATED_APPS}/{apps}/{os}/{version}')
    })

    it('should use custom path instead', () => {
      const resource = new HALResourceWithRoutes({}, this.providers)

      resource.addTemplatedLink('product', '/custom/path')
      assert.equal(resource._links.product.href, 'https://test.goabout.com/custom/path')
    })

    it('should explicitly use custom path instead', () => {
      const resource = new HALResourceWithRoutes({}, this.providers)

      resource.addTemplatedLink('product', 'CUSTOM_PRODUCT', null, { customPath: '/custom/path' })
      assert.equal(resource._links.product.href, 'https://test.goabout.com/custom/path')
    })
  })
})
