'use strict'

var Koa = require('koa')
var logger = require('../')
var dest = require('pino').destination({ sync: false, minLength: 4096 })

var app = new Koa()
app.use(logger({}, dest))

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
