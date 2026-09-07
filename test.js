'use strict'

const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const split = require('split2')
const tspl = require('@matteo.collina/tspl')
const Koa = require('koa')

const pinoLogger = require('./')

function setup (t, middlewares, cb) {
  const app = new Koa()
  app.silent = true

  if (!Array.isArray(middlewares)) {
    middlewares = [middlewares]
  }
  middlewares.forEach(function (middleware) {
    app.use(middleware)
  })

  const server = app.listen(0, '127.0.0.1', function (err) {
    cb(err, server)
  })
  app.use((ctx, next) => {
    if (ctx.request.url === '/') {
      ctx.body = 'hello world'
    }
    return next()
  })
  t.after(function (cb) {
    server.close(cb)
  })

  return app
}

function doGet (server) {
  const address = server.address()
  http.get('http://' + address.address + ':' + address.port)
}

function doGetWithAuthorization (server) {
  const address = server.address()
  const options = {
    hostname: address.address,
    port: address.port,
    path: '/',
    headers: {
      authorization: 'Bearer secret'
    }
  }
  http.get(options)
}

function doGetError (server) {
  const address = server.address()
  http.get('http://' + address.address + ':' + address.port + '/error')
}

test('default settings', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGet(server)
  })

  dest.on('data', function (line) {
    assert.ok(line.req, 'req is defined')
    assert.ok(line.res, 'res is defined')
    assert.equal(line.msg, 'request completed', 'message is set')
    assert.equal(line.req.method, 'GET', 'method is get')
    assert.equal(line.res.statusCode, 200, 'statusCode is 200')
    end()
  })
})

test('redacts request headers', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger({
    redact: ['req.headers.authorization']
  }, dest)

  setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGetWithAuthorization(server)
  })

  dest.on('data', function (line) {
    assert.equal(line.req.headers.authorization, '[Redacted]')
    end()
  })
})

test('exposes the internal pino', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  dest.on('data', function (line) {
    assert.equal(line.msg, 'hello world')
    end()
  })

  logger.logger.info('hello world')
})

test('exposes request bound child logger on context, req, res, request, response objects', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)
  const app = setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGet(server)
  })

  app.use((ctx, next) => {
    assert.equal(ctx.req.log, ctx.log)
    assert.equal(ctx.res.log, ctx.log)
    assert.equal(ctx.request.log, ctx.log)
    assert.equal(ctx.response.log, ctx.log)
    ctx.log.info('test')
    return next()
  })

  dest.once('data', function (line) {
    assert.equal(line.msg, 'test', 'msg should be "test"')
    assert.ok(line.req, 'should be child logger with req')
    end()
  })
})

test('allocate a unique id to every request', async function (t) {
  const plan = tspl(t, { plan: 5 })

  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)
  let lastId = null

  setup(t, logger, function (err, server) {
    plan.equal(err, undefined)
    doGet(server)
    doGet(server)
  })

  dest.on('data', function (line) {
    plan.equal(line.req.id !== lastId, true)
    lastId = line.req.id
    plan.ok(line.req.id, 'req.id is defined')
  })

  await plan
})

test('supports errors in the response', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  const app = setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGetError(server)
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      ctx.res.flushHeaders()
      ctx.res.emit('error', Error('boom!'))
    }
    return next()
  })

  dest.on('data', function (line) {
    assert.ok(line.req, 'req is defined')
    assert.ok(line.res, 'res is defined')
    assert.ok(line.err, 'err is defined')
    assert.equal(line.msg, 'request errored', 'message is set')
    assert.equal(line.req.method, 'GET', 'method is get')
    assert.equal(line.res.statusCode, 200, 'statusCode is 200')
    end()
  })
})

test('status code will be null if headers are not flushed in response', async function (t) {
  const plan = tspl(t, { plan: 2 })
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  const app = setup(t, logger, function (err, server) {
    plan.equal(err, undefined)
    doGetError(server)
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      ctx.res.emit('error', Error('boom!'))
    }
    return next()
  })

  dest.on('data', function (line) {
    plan.equal(line.res.statusCode, null, 'statusCode is null')
  })

  await plan
})

test('supports errors in the middleware', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  const app = setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGetError(server)
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      throw Error('boom!')
    }
    return next()
  })

  dest.once('data', function (line) {
    // logging the error:
    assert.ok(line.req, 'req is defined')
    assert.equal(line.err.message, 'boom!')
    dest.once('data', function (line) {
      // logging the 500 response:
      assert.ok(line.req, 'req is defined')
      assert.ok(line.err, 'err is defined')
      assert.equal(line.msg, 'request errored')
      assert.equal(line.req.method, 'GET', 'method is get')
      assert.equal(line.res.statusCode, 500, 'statusCode is 500')
      end()
    })
  })
})

test('does not inhibit downstream error handling', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  const app = setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGetError(server)
  })

  app.use((ctx, next) => {
    return next().catch((e) => {
      assert.ok(e)
      assert.equal(e.message, 'boom!')
      end()
    })
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      throw Error('boom!')
    }
    return next()
  })
})

test('work with error reporting middlewares', async function (t) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  const plan = tspl(t, { plan: 3 })

  function reporter (ctx, next) {
    return next().catch((e) => {
      plan.ok(e)
      ctx.app.emit('error', e, ctx)
      ctx.body = {
        message: e.message
      }
    })
  }

  const app = setup(t, [reporter, logger], function (err, server) {
    plan.equal(err, undefined)
    doGetError(server)
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      throw Error('boom!')
    }
    return next()
  })

  dest.once('data', function (line) {
    plan.equal(line.err.message, 'boom!', 'err message is boom!')
  })

  await plan
})

test('responseTime', function (t, end) {
  const dest = split(JSON.parse)
  const logger = pinoLogger(dest)

  const app = setup(t, logger, function (err, server) {
    assert.equal(err, undefined)
    doGet(server)
  })

  function sleep () {
    return new Promise(function (resolve, reject) {
      setTimeout(resolve, 100)
    })
  }

  app.use((ctx, next) => {
    return sleep(100).then(() => next())
  })

  dest.once('data', function (line) {
    // let's take into account Node v0.10 is less precise
    assert.ok(line.responseTime >= 90, 'responseTime is defined and in ms')
    end()
  })
})
