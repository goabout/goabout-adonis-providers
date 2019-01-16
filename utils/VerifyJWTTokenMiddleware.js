const jwt = require('jsonwebtoken')
const moment = require('moment')

const expireCertificateIn = 12 // hours
let $pem = ''
let $pemExpires = moment()

// This middleware checks whether JWT token is correct and still valid.
// To make it work, fill OAUTH_PEM (link to PEM certificate), OAUTH_ISSUER and OAUTH_AUDIENCE in your env file

class VerifyJWTToken {

  constructor(Log, Errors, Env, Request) {
    this.$Log = Log
    this.$Errors = Errors
    this.$Env = Env
    this.$Request = Request
  }

  async handle({ request, response }, next) {
    if (!request.token || request.token.length < 64) return next()

    if (this.isExpiredPem()) await this.getNewPem()
    const pem = this.getPem()

    try {
      request.jwtToken = jwt.verify(request.token, pem, {
        issuer: this.$Env.get('OAUTH_ISSUER'),
        audience: this.$Env.get('OAUTH_AUDIENCE')
      })
    } catch (err) {
      this.$Log.debug('User is authorized with JWT token but the token is invalid')
      this.$Log.error(err.message)
      throw new this.$Errors.Unauthorized()
    }

    return next()
  }

  getPem() {
    return $pem
  }

  // Expire time is only used in tests
  setPem(newPem, expireTime) {
    $pem = newPem ? `-----BEGIN CERTIFICATE-----\n${newPem}\n-----END CERTIFICATE-----` : null
    $pemExpires = expireTime || moment().add(expireCertificateIn, 'hours')
  }

  isExpiredPem() {
    if (!$pem) return true
    return $pemExpires.isBefore(moment())
  }

  async getNewPem() {
    const oauthPemUrl = this.$Env.get('OAUTH_PEM')
    if (!oauthPemUrl) throw new this.$Errors.Crash({ message: 'E_NO_OAUTH_PEM_KEY_LINK', details: 'Url to oauth pem key is not set' })
    this.$Log.debug(`Getting new PEM key from ${oauthPemUrl}`)

    // Request.send will handle crash cases
    const response = await this.$Request.send({ url: oauthPemUrl })
    const newPem = response.body.keys[0].x5c[0]

    this.$Log.debug(`Successfully got PEM key ${newPem.slice(0, 5)}...${newPem.slice(-5)}`)

    this.setPem(newPem)
  }


}

module.exports = VerifyJWTToken
