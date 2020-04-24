'use strict'

var pinoHttp = require('pino-http')

module.exports = logger

function logger (opts, stream) {
  var wrap = pinoHttp(opts, stream)
  function pino (ctx, next) {
    wrap(ctx.req, ctx.res)
    ctx.log = ctx.request.log = ctx.response.log = ctx.req.log
    return next().catch(function (err) {
      ctx.log.error({ err })
      throw err
    })
  }
  pino.logger = wrap.logger
  return pino
}
