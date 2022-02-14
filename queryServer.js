import http from 'http'

export default class QueryServer {
  constructor({ QUERY }) {
    this.QUERY = QUERY
  }

  handleRequest = (req,res) => {
    switch (req.method) {
      case "POST": {
        let data = ""
        req.on('data', chunk => data += chunk)
        req.on('end', _ => {
          try {
            const data = JSON.parse(data)
            res.statusCode = 200
            this.QUERY(data.query, data.opts).then(result => {
              res.setHeader("Access-Control-Allow-Origin","*")
              res.write(JSON.stringify(result))
              res.end()
            })
          } catch {
            res.statusCode = 400
            res.end()
          }
        })
        break
      }
      case "OPTIONS": {
        res.setHeader("Access-Control-Allow-Origin","*")
        res.setHeader("Access-Control-Allow-Methods","POST")
        res.setHeader("Access-Control-Allow-Headers","*")
        res.setHeader("Access-Control-Max-Age","600")
        res.end()
      }
      default: {
        res.statusCode = 405 //method not allowed
        res.end()
      }
    }
  }
  
  server = http.createServer(this.handleRequest)

  listen = port => this.server.listen(port)
}
