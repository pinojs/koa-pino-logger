'use strict'

const logger = require('koa-logger')
const Koa = require('koa')

const app = new Koa()
app.use(logger())

app.use((ctx) => {
  this.body = 'hello world'
})

app.listen(3000)
