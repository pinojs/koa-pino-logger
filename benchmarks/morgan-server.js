'use strict'

const morgan = require('koa-morgan')
var Koa = require('koa')

var app = new Koa()
app.use(morgan('combined'))

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
