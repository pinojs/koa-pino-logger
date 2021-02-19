'use strict'

const Koa = require('koa')

const app = new Koa()

app.use((ctx) => {
  this.body = 'hello world'
})

app.listen(3000)
