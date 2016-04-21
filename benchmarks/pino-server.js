'use strict'

var koa = require('koa')
var logger = require('../')

var app = koa()
app.use(logger())

app.use(function * () {
  this.body = 'hello world'
})

app.listen(3000)
