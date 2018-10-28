/*
  Extends HALResource with CLS and Routes but then requires Adonis modules
 */
const HALResource = require('./HALResource')

// Since JS doesn't really have private properties, we can reference private values via symbols.
const $ = Symbol('$')

class HALResourceWithRoutes extends HALResource {
  constructor(data, providers) {
    super(data)
    // Injected values
    this[$] = {}
    Object.keys(providers).forEach(key => { this[$][key] = providers[key] })
    this[$].template = this[$].Config.get('hal.templates')

    this.init({ ignoreBrokenInit: true })
  }

  init({ request, ignoreBrokenInit } = {}) {
    const host = request ? (request.header('x-forwarded-host') || request.header('host')) : this[$].CLS.get('request.host')
    const protocol = request ? request.header('x-forwarded-proto') : this[$].CLS.get('request.protocol')

    if (!ignoreBrokenInit && (!host || !protocol)) {
      throw new this[$].Errors.Crash('E_NO_HOSTNAME_FOUND')
    }

    this[$].host = `${protocol}://${host}`
  }


  addTemplatedLink(rel, templateOrPath, props = {}, { customPath, ignoreMissingProps } = {}) {
    const link = this.$generate({ templateOrPath, customPath, props, ignoreMissingProps })
    this.addLink(rel, link)
    return this
  }

  $generate({ templateOrPath, customPath, props, ignoreMissingProps }) {
    let path = customPath || this[$].template[templateOrPath] || templateOrPath

    path = this.$matchAgainst({ path, propertiesToMatch: this[$].template })

    const propsToFulfill = this.$mergePropertiesToFillWithContext({ path, existingProperties: props })

    path = this.$matchAgainst({ path, propertiesToMatch: propsToFulfill })

    if (!ignoreMissingProps) this.$crashIfMissingProps({ path, templateOrPath })

    return this[$].host + path
  }

  $getRequiredProperties({ path }) {
    const props = path.match(/\{.*?\}/gi)
    return props && props.length ? props.map(v => v.replace(/\{|\}/gi, '')) : []
  }

  $mergePropertiesToFillWithContext({ path, existingProperties = {} }) {
    const requiredPropertes = this.$getRequiredProperties({ path })
    if (!requiredPropertes.length) return null

    const fulfilledProperties = {}

    requiredPropertes.forEach(key => {
      fulfilledProperties[key] = (existingProperties && existingProperties[key]) || this[$].CLS.get(key)
    })

    return fulfilledProperties
  }

  $matchAgainst({ path, propertiesToMatch }) {
    const properties = path.match(/\{.*?\}/gi)
    if (!properties || !properties.length || !propertiesToMatch) return path

    let generatedPath = path

    properties.forEach(keyWithBraces => {
      const keyWithoutBraces = keyWithBraces.replace(/(\{|\})/g, '')
      const matchedProperty = propertiesToMatch[keyWithoutBraces]
      if (matchedProperty !== undefined) generatedPath = generatedPath.replace(keyWithBraces, matchedProperty, 'g')
    })

    return generatedPath
  }

  $crashIfMissingProps({ path, template }) {
    const properties = this.$getRequiredProperties({ path })

    if (properties && properties.length) throw new this[$].Errors.Crash('E_NO_LINK_PROPERTY_FOUND', `No link property found for ${JSON.stringify(properties)} in ${template}`)
  }

}

module.exports = HALResourceWithRoutes
