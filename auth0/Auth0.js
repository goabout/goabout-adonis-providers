const redisKey = 'auth0:client_credentials'

class Auth0 {

  constructor(providers = {}) {
    Object.keys(providers).forEach(key => { this[`$${key}`] = providers[key] })
    if (!this.$Log) this.$Log = console

    this.clientId = this.$Env.get('OAUTH_CLIENT_ID')
    this.clientSecret = this.$Env.get('OAUTH_CLIENT_SECRET')
    this.audience = this.$Env.get('OAUTH_AUDIENCE')
    this.issuer = this.$Env.get('OAUTH_ISSUER')

    if (!this.clientId || !this.clientSecret || !this.audience || !this.issuer) throw new this.$Errors.Crash({ message: 'E_MISSING_AUTH0_CONFIG' })
  }

  async getToken() {
    // If not, request a new one
    let token = await this.getTokenFromRedis()
    if (token) return token

    this.$Log.debug('Getting fresh auth0 token')
    const response = await this.$Request.send({
      url: `${this.issuer}oauth/token`,
      method: 'POST',
      body: {
        'grant_type': 'client_credentials',
        'client_id': this.clientId,
        'client_secret': this.clientSecret,
        'audience': this.audience
      },
      json: true
    })

    token = response.body.access_token
    const expireTime = response.body.expires_in

    this.$Log.debug(`Got fresh auth0 token with expire time of ${expireTime} seconds`)
    await this.saveTokenToRedis({ token, expireTime })

    return token
  }

  async getTokenFromRedis() {
    // First check that the token was saved in redis
    const token = this.$Redis ? await this.$Redis.get(redisKey) : null
    if (token) {
      this.$Log.debug('Found auth0 token in cache, using it…')
      return token
    }
    return null
  }

  async saveTokenToRedis({ token, expireTime }) {
    // And save the token to redis since it lives for some time
    if (!this.$Redis) return
    const redisTransaction = this.$Redis.multi()
    redisTransaction.set(redisKey, token)
    redisTransaction.expire(redisKey, expireTime - 60)
    await redisTransaction.exec()
    this.$Log.debug(`Auth0 token saved to redis with expire time of ${expireTime - 60}`)
  }
}

module.exports = Auth0
