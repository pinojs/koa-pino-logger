# koa-pino-logger&nbsp;&nbsp;[![Build Status](https://travis-ci.org/davidmarkclements/koa-pino-logger.svg)](https://travis-ci.org/davidmarkclements/koa-pino-logger)


[pino](https://github.com/mcollina/pino) logging [koa](http://npm.im/koa) middleware

`koa-pino-logger@1.x.x` is for koa v1 - [v1 readme](https://github.com/davidmarkclements/koa-pino-logger/tree/v1)

`koa-pino-logger@2.x.x` is for koa v2 - [v2 readme](https://github.com/davidmarkclements/koa-pino-logger/tree/v2)

To our knowledge, `koa-pino-logger` is the [fastest](#benchmarks) [koa](http://npm.im/koa) logger in town.

* [Benchmarks](#benchmarks)
* [Installation](#install)
* [Usage](#example)
* [API](#api)
* [Acknowledgements](#acknowledgements)
* [License](#license)

## Benchmarks

Benchmarks log each request/response pair while returning
`'hello world'`, using
[autocannon](https://github.com/mcollina/autocannon) with 100
connections and pipelining set to 1 (koa can't handle pipelining): `autocannon -c 100 -p 1 http://localhost:3000`.

* `koa-bunyan-logger`: 5940 req/sec
* `koa-json-logger`: 7171 req/sec
* `koa-logger`: 8591 req/sec
* `koa-morgan`: 9749 req/sec
* `koa-pino-logger`: 9860 req/sec
* `koa-pino-logger` (extreme): 10661 req/sec
* koa w/out logger: 13454 req/sec

All benchmarks where taken on a Macbook Pro 2013 (2.6GHZ i7, 16GB of RAM). 

Benchmarking against `koa-logger` is an apples vs oranges situation. `koa-logger` is for development logging, and has extremely simple (non-JSON) output. Still, `koa-pino-logger` is faster so... why not. 

Additionally, whilst we're comparing `koa-pino-logger` against [morgan](http://npm.im/morgan), this isn't really a fair contest. 

Morgan doesn't support logging arbitrary data, nor does it output JSON. Further Morgan [uses a form of `eval`](https://github.com/koajs/morgan/blob/5da5ff1f5446e3f3ff29d29a2d6582712612bf89/index.js#L383) to achieve high speed logging. Whilst probably safe, using `eval` at all tends to cause concern, particular when it comes to server-side JavaScript.

The fact that `koa-pino-logger` achieves higher throughput with JSON logging **and** arbitrary data, without using `eval`, serves to emphasise the high-speed capabilities of `koa-pino-logger`. 

With `koa-pino-logger` you can have features, safety **and** speed. 

## Install

Koa v1 - [[v1 readme](https://github.com/davidmarkclements/koa-pino-logger/tree/v1)]:

```
npm i koa-pino-logger@1 --save
```


Koa v2 - [[v2 readme](https://github.com/davidmarkclements/koa-pino-logger/tree/v2)]:

```
npm i koa-pino-logger@2 --save
```

Currently, default install is for v1, once Koa v2 is released
the default will be v2. 

## Example

### Request logging

```js
'use strict'

var koa = require('koa')
var logger = require('koa-pino-logger')

var app = koa()
app.use(logger())

app.use(function * () {
  this.log.info('something else')
  this.body = 'hello world'
})

app.listen(3000)
```
```
$ node example.js | pino
[2016-04-21T10:46:47.292Z] INFO (18254 on MacBook-Pro-4.local): something else
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 64839
    }
[2016-04-21T10:46:47.300Z] INFO (18254 on MacBook-Pro-4.local): request completed
    res: {
      "statusCode": 200,
      "header": "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 11\r\nDate: Thu, 21 Apr 2016 10:46:47 GMT\r\nConnection: keep-alive\r\n\r\n"
    }
    responseTime: 8
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 64839
    }
```

### Thrown Error logging


```js
'use strict'

var koa = require('koa')
var logger = require('koa-pino-logger')

var app = koa()
app.silent = true //disable console.errors
app.use(logger())

app.use(function * () {
  this.body = 'hello world'
  throw Error('bang!')
})

app.listen(3000)
```

```
$ node error-example.js | pino
[2016-04-21T12:24:18.101Z] ERROR (19295 on MacBook-Pro-4.local): request errored
    res: {
      "statusCode": 200,
      "header": null
    }
    err: {
      "type": "Error",
      "message": "bang!",
      "stack": "Error: bang!\n    at Error (native)\n    at Object.<anonymous> (/Users/davidclements/z/nearForm/koa-pino-logger/error-example.js:12:9)\n    at next (native)\n    at Object.<anonymous> (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/koa-compose/index.js:28:12)\n    at next (native)\n    at onFulfilled (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/co/index.js:65:19)\n    at /Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/co/index.js:54:5\n    at Object.co (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/co/index.js:50:10)\n    at Object.createPromise (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/co/index.js:30:15)\n    at Server.<anonymous> (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/lib/application.js:136:8)"
    }
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 49756
    }
[2016-04-21T12:24:18.107Z] INFO (19295 on MacBook-Pro-4.local): request completed
    res: {
      "statusCode": 500,
      "header": "HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 21\r\nDate: Thu, 21 Apr 2016 12:24:18 GMT\r\nConnection: keep-alive\r\n\r\n"
    }
    responseTime: 10
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 49756
    }
```

## API

`koa-pino-logger` has the same options as
[pino](http://npm.im/pino)
`koa-pino-logger` will log when a request finishes or errors. 

Along with automated request logging, the pino logger facilitates manual logging 
by adding the pino logger instance to the the context, request, response, req and res objects:

```js
  app.use(function * (next) {
    this.log.info('test 1')
    this.request.log.info('test 2')
    this.respose.log.info('test 3')
    this.res.log.info('test 4')
    this.req.log.info('test 5')
    yield next
  })
```

We recommend using `this.log` in the general case.

## License

MIT
