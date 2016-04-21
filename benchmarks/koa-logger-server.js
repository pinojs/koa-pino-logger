'use strict'

var logger = require('koa-logger')
var koa = require('koa')

var app = koa()
app.use(logger())

app.use(function * () {
  this.body = 'hello world'
})

app.listen(3000)
