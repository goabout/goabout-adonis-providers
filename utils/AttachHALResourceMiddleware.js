

class AttachHALResource {

  constructor(providers) {
    Object.keys(providers).forEach(key => { this[`$${key}`] = providers[key] })
  }

  async handle({ request }, next) {
    const host = request.header('x-forwarded-host') || request.header('host')
    const protocol = request.header('x-forwarded-proto') || request.header('scheme') || 'http'

    this.$CLS.set('request.host', host)
    this.$CLS.set('request.protocol', protocol)

    await next()
  }

}

module.exports = AttachHALResource

