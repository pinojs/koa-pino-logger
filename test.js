'use strict'

var test = require('tap').test
var http = require('http')
var Koa = require('koa')
var pinoLogger = require('./')
var split = require('split2')

function setup (t, middlewares, cb) {
  var app = new Koa()
  app.silent = true

  if (!Array.isArray(middlewares)) {
    middlewares = [middlewares]
  }
  middlewares.forEach(function (middleware) {
    app.use(middleware)
  })

  var server = app.listen(0, '127.0.0.1', function (err) {
    cb(err, server)
  })
  app.use((ctx, next) => {
    if (ctx.request.url === '/') {
      ctx.body = 'hello world'
    }
    return next()
  })
  t.tearDown(function (cb) {
    server.close(cb)
  })

  return app
}

function doGet (server) {
  var address = server.address()
  http.get('http://' + address.address + ':' + address.port)
}

test('default settings', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  setup(t, logger, function (err, server) {
    t.error(err)
    doGet(server)
  })

  dest.on('data', function (line) {
    t.ok(line.req, 'req is defined')
    t.ok(line.res, 'res is defined')
    t.equal(line.msg, 'request completed', 'message is set')
    t.equal(line.req.method, 'GET', 'method is get')
    t.equal(line.res.statusCode, 200, 'statusCode is 200')
    t.end()
  })
})

test('exposes the internal pino', function (t) {
  t.plan(1)

  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  dest.on('data', function (line) {
    t.equal(line.msg, 'hello world')
  })

  logger.logger.info('hello world')
})

test('exposes request bound child logger on context, req, res, request, response objects', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)
  var app = setup(t, logger, function (err, server) {
    t.error(err)
    doGet(server)
  })

  app.use((ctx, next) => {
    t.equal(ctx.req.log, ctx.log)
    t.equal(ctx.res.log, ctx.log)
    t.equal(ctx.request.log, ctx.log)
    t.equal(ctx.response.log, ctx.log)
    ctx.log.info('test')
    return next()
  })

  dest.once('data', function (line) {
    t.equal(line.msg, 'test', 'msg should be "test"')
    t.ok(line.req, 'should be child logger with req')
    t.end()
  })
})

test('allocate a unique id to every request', function (t) {
  t.plan(5)

  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)
  var lastId = null

  setup(t, logger, function (err, server) {
    t.error(err)
    doGet(server)
    doGet(server)
  })

  dest.on('data', function (line) {
    t.notEqual(line.req.id, lastId)
    lastId = line.req.id
    t.ok(line.req.id, 'req.id is defined')
  })
})

test('supports errors in the response', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  var app = setup(t, logger, function (err, server) {
    t.error(err)
    var address = server.address()
    http.get('http://' + address.address + ':' + address.port + '/error')
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      ctx.res.emit('error', Error('boom!'))
    }
    return next()
  })

  dest.on('data', function (line) {
    t.ok(line.req, 'req is defined')
    t.ok(line.res, 'res is defined')
    t.ok(line.err, 'err is defined')
    t.equal(line.msg, 'request errored', 'message is set')
    t.equal(line.req.method, 'GET', 'method is get')
    t.equal(line.res.statusCode, 200, 'statusCode is 200')
    t.end()
  })
})

test('supports errors in the middleware', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  var app = setup(t, logger, function (err, server) {
    t.error(err)
    var address = server.address()
    http.get('http://' + address.address + ':' + address.port + '/error')
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
    t.ok(line.req, 'req is defined')
    t.ok(line.res, 'res is defined')
    t.ok(line.err, 'err is defined')
    t.equal(line.err.message, 'boom!', 'err message is boom!')
    t.equal(line.msg, 'request errored', 'message is request errored')
    dest.once('data', function (line) {
      // logging the 500 response:
      t.ok(line.req, 'req is defined')
      t.ok(line.res, 'res is defined')
      t.notOk(line.err, 'err is not defined')
      t.equal(line.msg, 'request completed', 'message is request completed')
      t.equal(line.req.method, 'GET', 'method is get')
      t.equal(line.res.statusCode, 500, 'statusCode is 500')
      t.end()
    })
  })
})

test('does not inhibit downstream error handling', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  var app = setup(t, logger, function (err, server) {
    t.error(err)
    var address = server.address()
    http.get('http://' + address.address + ':' + address.port + '/error')
  })

  app.use((ctx, next) => {
    return next().catch((e) => {
      t.ok(e)
      t.equal(e.message, 'boom!')
      t.end()
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

test('work with error reporting middlewares', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  t.plan(3)

  function reporter (ctx, next) {
    return next().catch((e) => {
      t.ok(e)
      ctx.app.emit('error', e, ctx)
      ctx.body = {
        message: e.message
      }
    })
  }

  var app = setup(t, [reporter, logger], function (err, server) {
    t.error(err)
    var address = server.address()
    http.get('http://' + address.address + ':' + address.port + '/error')
  })

  app.use((ctx, next) => {
    if (ctx.request.url === '/error') {
      ctx.body = ''
      throw Error('boom!')
    }
    return next()
  })

  dest.once('data', function (line) {
    t.equal(line.err.message, 'boom!', 'err message is boom!')
  })
})

test('responseTime', function (t) {
  var dest = split(JSON.parse)
  var logger = pinoLogger(dest)

  var app = setup(t, logger, function (err, server) {
    t.error(err)
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
    t.ok(line.responseTime >= 90, 'responseTime is defined and in ms')
    t.end()
  })
})
