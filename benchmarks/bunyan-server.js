'use strict'

var logger = require('koa-bunyan-logger')
var Koa = require('koa')

var app = new Koa()
app.use(logger())
app.use(logger.requestLogger())

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
