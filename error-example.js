'use strict'

var koa = require('koa')
var logger = require('./')

var app = koa()
app.silent = true //disable console.errors
app.use(logger())

app.use(function * () {
  this.body = 'hello world'
  throw Error('bang!')
})

app.listen(3000)
