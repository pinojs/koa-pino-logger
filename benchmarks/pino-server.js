'use strict'

const Koa = require('koa')
const logger = require('../')

const app = new Koa()
app.use(logger())

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
