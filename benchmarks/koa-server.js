'use strict'

var Koa = require('koa')

var app = new Koa()

app.use((ctx) => {
  this.body = 'hello world'
})

app.listen(3000)
