'use strict'

var pinoHttp = require('pino-http')

module.exports = logger

function logger (opts, stream) {
  var wrap = pinoHttp(opts, stream)
  function pino (ctx, next) {
    wrap(ctx.req, ctx.res)
    ctx.log = ctx.request.log = ctx.response.log = ctx.req.log
    ctx.onerror = catchErr(ctx, ctx.onerror)
    return next()
  }
  pino.logger = wrap.logger
  return pino
}

// overriding `onerror` is much faster that using try/catch
function catchErr (ctx, handler) {
  return function (e) {
    if (!e) { return handler.call(ctx, e) }
    ctx.log.error({
      res: ctx.res,
      err: {
        type: e.constructor.name,
        message: e.message,
        stack: e.stack
      },
      responseTime: ctx.res.responseTime
    }, 'request errored')
    return handler.call(ctx, e)
  }
}
