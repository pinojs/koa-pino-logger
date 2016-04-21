'use strict'

const morgan = require('koa-morgan')
var koa = require('koa')

var app = koa()
app.use(morgan.middleware('combined'))

app.use(function * () {
  this.body = 'hello world'
})

app.listen(3000)
