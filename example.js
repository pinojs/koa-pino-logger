'use strict'

var Koa = require('koa')
var logger = require('./')

var app = new Koa()
app.use(logger())

app.use((ctx) => {
  ctx.log.info('something else')
  ctx.body = 'hello world'
})

app.listen(3000)
