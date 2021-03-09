'use strict'

const pino = require('pino')
const serializers = require('pino-std-serializers')
const URL = require('fast-url-parser')
const startTime = Symbol('startTime')

function pinoLogger (opts, stream) {
  if (opts && opts._writableState) {
    stream = opts
    opts = null
  }

  opts = Object.assign({}, opts)

  opts.customAttributeKeys = opts.customAttributeKeys || {}
  const reqKey = opts.customAttributeKeys.req || 'req'
  const resKey = opts.customAttributeKeys.res || 'res'
  const errKey = opts.customAttributeKeys.err || 'err'
  const finishedKey = opts.customAttributeKeys.finished || 'finished'
  const onlyLogFinishedRequest = typeof opts.onlyLogFinishedRequest === 'boolean' ? opts.onlyLogFinishedRequest : true
  const responseTimeKey = opts.customAttributeKeys.responseTime || 'responseTime'
  delete opts.customAttributeKeys

  const customProps = opts.customProps || opts.reqCustomProps || {}

  opts.wrapSerializers = 'wrapSerializers' in opts ? opts.wrapSerializers : true
  if (opts.wrapSerializers) {
    opts.serializers = Object.assign({}, opts.serializers)
    const requestSerializer = opts.serializers[reqKey] || opts.serializers.req || serializers.req
    const responseSerializer = opts.serializers[resKey] || opts.serializers.res || serializers.res
    const errorSerializer = opts.serializers[errKey] || opts.serializers.err || serializers.err
    opts.serializers[reqKey] = serializers.wrapRequestSerializer(requestSerializer)
    opts.serializers[resKey] = serializers.wrapResponseSerializer(responseSerializer)
    opts.serializers[errKey] = serializers.wrapErrorSerializer(errorSerializer)
  }
  delete opts.wrapSerializers

  if (opts.useLevel && opts.customLogLevel) {
    throw new Error('You can\'t pass \'useLevel\' and \'customLogLevel\' together')
  }

  if (onlyLogFinishedRequest === false && process.stdout.writableEnded === undefined) {
    throw new Error('\'onlyLogFinishedRequest\': false requires Node v12.9.0 or later')
  }

  const useLevel = opts.useLevel || 'info'
  const customLogLevel = opts.customLogLevel
  delete opts.useLevel
  delete opts.customLogLevel

  const theStream = opts.stream || stream
  delete opts.stream

  const autoLogging = (opts.autoLogging !== false)
  const autoLoggingIgnorePaths = (opts.autoLogging && opts.autoLogging.ignorePaths) ? opts.autoLogging.ignorePaths : []
  const autoLoggingGetPath = opts.autoLogging && opts.autoLogging.getPath ? opts.autoLogging.getPath : null
  delete opts.autoLogging

  const successMessage = opts.customSuccessMessage || function () { return 'request completed' }
  const errorMessage = opts.customErrorMessage || function () { return 'request errored' }
  delete opts.customSuccessfulMessage
  delete opts.customErroredMessage

  const logger = wrapChild(opts, theStream)
  const genReqId = reqIdGenFactory(opts.genReqId)
  loggingMiddleware.logger = logger
  return loggingMiddleware

  // This hoists above the return
  function onResFinished (err) {
    if (this.alreadyLogged) return
    this.removeListener('error', onResFinished)
    this.removeListener('finish', onResFinished)
    if (!onlyLogFinishedRequest) this.removeListener('close', onResFinished)

    const log = this.log
    const responseTime = Date.now() - this[startTime]
    const level = customLogLevel ? customLogLevel(this, err) : useLevel

    if (err || this.err || this.statusCode >= 500) {
      const error = err || this.err || new Error('failed with status code ' + this.statusCode)

      log[level]({
        [resKey]: this,
        [errKey]: error,
        [responseTimeKey]: responseTime
      }, errorMessage(error, this))
      this.alreadyLogged = true
      return
    }

    log[level]({
      [resKey]: this,
      [finishedKey]: !onlyLogFinishedRequest ? this.writableEnded : true,
      [responseTimeKey]: responseTime
    }, successMessage(this))
    this.alreadyLogged = true
  }

  function loggingMiddleware (ctx) {
    let shouldLogSuccess = true
    const { req, res } = ctx

    // TODO: Is this where we want to set this for koa? (versus ctx or state)
    // Can we extract request-ids commonly available and/or be compatible with open telemetry/tracing
    req.id = genReqId(ctx)

    let log = logger.child({ [reqKey]: req })

    if (customProps) {
      const customPropBindings = (typeof customProps === 'function') ? customProps(ctx) : customProps
      log = log.child(customPropBindings)
    }

    ctx.log = req.log = res.log = log
    ctx.res[startTime] = ctx.res[startTime] || Date.now()
    ctx.response[startTime] = ctx.response[startTime] || Date.now()
    ctx[startTime] = ctx[startTime] || Date.now()

    // TODO: do we need to expose the option to filter on the original url?
    if (autoLogging) {
      if (autoLoggingIgnorePaths.length) {
        let url
        if (autoLoggingGetPath) {
          url = URL.parse(autoLoggingGetPath(ctx))
        } else if (ctx.request.url) {
          url = URL.parse(ctx.request.url)
        }
        if (url && url.pathname) {
          shouldLogSuccess = !autoLoggingIgnorePaths.find(ignorePath => {
            if (ignorePath instanceof RegExp) {
              return ignorePath.test(url.pathname)
            }
            return ignorePath === url.pathname
          })
        }
      }

      if (shouldLogSuccess) {
        res.on('finish', onResFinished)
        if (!onlyLogFinishedRequest) {
          res.on('close', onResFinished)
        }
      }

      res.on('error', onResFinished)
    }
  }
}

function wrapChild (opts, stream) {
  const prevLogger = opts.logger
  const prevGenReqId = opts.genReqId
  let logger = null

  if (prevLogger) {
    opts.logger = undefined
    opts.genReqId = undefined
    logger = prevLogger.child(opts)
    opts.logger = prevLogger
    opts.genReqId = prevGenReqId
  } else {
    logger = pino(opts, stream)
  }

  return logger
}

function reqIdGenFactory (func) {
  if (typeof func === 'function') return func
  const maxInt = 2147483647
  let nextReqId = 0
  return function genReqId (ctx) {
    // TODO: decide on order of keys, this matches current behavior of checking req.id
    return ctx.req.id || ctx.id || ctx.state.id || (nextReqId = (nextReqId + 1) & maxInt)
  }
}

module.exports = logger

module.exports.stdSerializers = {
  err: serializers.err,
  req: serializers.req,
  res: serializers.res
}

module.exports.startTime = startTime

function logger (opts, stream) {
  const wrap = pinoLogger(opts, stream)

  function pino (ctx, next) {
    wrap(ctx)
    ctx.log = ctx.request.log = ctx.response.log = ctx.req.log
    return next().catch(function (err) {
      ctx.log.error({ err })
      throw err
    })
  }

  pino.logger = wrap.logger
  return pino
}
