import si from 'search-index' // https://github.com/fergiemcdowall/search-index
// *very* weird bug, importing oai-pmh before search-index causes a segfault
import Harvester from './harvest.js'
import QueryServer from './queryServer.js'

console.log("initializing...")

const { PUT, QUERY, DELETE, DOCUMENT_COUNT } = await si({name: "storage/fii"})

const harvester = new Harvester({ PUT, DELETE, DOCUMENT_COUNT })

const server = new QueryServer({ QUERY })

setInterval(harvester.safeHarvest, 1200000) // every 20 minutes

server.listen(5000)
