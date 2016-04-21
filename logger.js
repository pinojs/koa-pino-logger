'use strict'

var pinoHttp = require('pino-http')
// we're going to fake a generator, because it adds ~1k req/sec
var GeneratorFunction = function * nogen () {}.constructor
module.exports = logger

function logger (stream, opts) {
  var wrap = pinoHttp(stream, opts)
  function pino (next) {
    wrap(this.req, this.res)
    this.log = this.request.log = this.response.log = this.req.log
    this.onerror = catchErr(this, this.onerror)
    return next
  }
  pino.constructor = GeneratorFunction
  pino.logger = wrap.logger
  return pino
}

// overriding `onerror` is much faster that using try/catch
function catchErr (ctx, handler) {
  return function (e) {
    if (!e) { return handler(e) }
    ctx.log.error({
      res: ctx.res,
      err: {
        type: e.constructor.name,
        message: e.message,
        stack: e.stack
      },
      responseTime: ctx.res.responseTime
    }, 'request errored')
    return handler(e)
  }
}
