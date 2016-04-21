'use strict'

var logger = require('koa-json-logger')
var koa = require('koa')

var app = koa()
app.use(logger({path: null}))

app.use(function * () {
  this.body = 'hello world'
})

app.listen(3000)
