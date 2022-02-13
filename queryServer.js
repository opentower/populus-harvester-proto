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
          const query = JSON.parse(data)
          res.statusCode = 200
          this.QUERY(query).then(result => {
            res.write(JSON.stringify(result))
            res.end()
          })
        })
        break
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
