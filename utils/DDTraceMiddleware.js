class DDTraceMiddleware {

  constructor(providers) {
    Object.keys(providers).forEach(key => { this[`$${key}`] = providers[key] })
  }

  async handle(ctx, next) {
    const datadog = ctx.req._datadog
    if (!datadog) return next()

    const matchedRoute = this.$Route.match(ctx.request.url(), ctx.request.method(), ctx.request.hostname()).route._route
    const traceId = datadog.span.context().toTraceId()

    datadog.span.setTag('http.route', matchedRoute)
    this.$CLS.set('session', traceId)
    return next()
  }

}

module.exports = DDTraceMiddleware

