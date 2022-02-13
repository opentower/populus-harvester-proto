import si from 'search-index' // https://github.com/fergiemcdowall/search-index
// *very* weird bug, importing oai-pmh before search-index causes a segfault
import Harvester from './harvest.js'
import http from 'http'
 
console.log("initializing...")

const { PUT, QUERY, DELETE, DOCUMENT_COUNT } = await si()

const harvester = new Harvester({ PUT, DELETE, DOCUMENT_COUNT })

setInterval(harvester.safeHarvest, 10000)

const server = http.createServer((req,res) => {
  switch (req.method) {
    case "POST": {
      let data = ""
      req.on('data', chunk => data += chunk)
      req.on('end', _ => {
        const query = JSON.parse(data)
        res.statusCode = 200
        QUERY(query).then(result => {
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
})

server.listen(8080)
