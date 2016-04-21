'use strict'

var logger = require('koa-bunyan-logger')
var koa = require('koa')

var app = koa()
app.use(logger())
app.use(logger.requestLogger())

app.use(function * () {
  this.body = 'hello world'
})

app.listen(3000)
