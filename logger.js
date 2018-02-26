'use strict'

var pinoHttp = require('pino-http')

module.exports = logger

function logger (opts, stream) {
  var wrap = pinoHttp(opts, stream)
  function pino (ctx, next) {
    wrap(ctx.req, ctx.res)
    ctx.log = ctx.request.log = ctx.response.log = ctx.req.log
    return next().catch(function (e) {
      ctx.log.error({
        res: ctx.res,
        err: {
          type: e.constructor.name,
          message: e.message,
          stack: e.stack
        },
        responseTime: ctx.res.responseTime
      }, 'request errored')
      throw e
    })
  }
  pino.logger = wrap.logger
  return pino
}
