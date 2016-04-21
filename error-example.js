'use strict'

var Koa = require('koa')
var logger = require('./')

var app = new Koa()
app.silent = true // disable console.errors
app.use(logger())

app.use((ctx) => {
  ctx.body = 'hello world'
  throw Error('bang!')
})

app.listen(3000)
