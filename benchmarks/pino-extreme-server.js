'use strict'

var Koa = require('koa')
var logger = require('../')

var app = new Koa()
app.use(logger({extreme: true}))

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
