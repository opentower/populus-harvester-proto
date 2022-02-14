import si from 'search-index' // https://github.com/fergiemcdowall/search-index
// *very* weird bug, importing oai-pmh before search-index causes a segfault
import Harvester from './harvest.js'
import QueryServer from './queryServer.js'

var initCount = 1
 
async function initialize() {
  console.log(`initializing, take ${initCount}...`)
  try { 
    const db = await si({name: "storage/fii"}) 
    return db
  }
  catch { 
    await new Promise(res => setTimeout(res, 1000))
    return initialize()
  }
}

const { PUT, QUERY, DELETE, DOCUMENT_COUNT } = await initialize()

const harvester = new Harvester({ PUT, DELETE, DOCUMENT_COUNT })

const server = new QueryServer({ QUERY })

setInterval(harvester.safeHarvest, 1200000) // every 20 minutes

server.listen(5000)
