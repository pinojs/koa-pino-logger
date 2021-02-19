'use strict'

const Koa = require('koa')
const logger = require('../')
const dest = require('pino').destination({ sync: false, minLength: 4096 })

const app = new Koa()
app.use(logger({}, dest))

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
