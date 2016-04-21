'use strict'

var logger = require('koa-logger')
var Koa = require('koa')

var app = new Koa()
app.use(logger())

app.use((ctx) => {
  this.body = 'hello world'
})

app.listen(3000)
