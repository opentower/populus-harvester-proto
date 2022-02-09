import si from 'search-index' // https://github.com/fergiemcdowall/search-index
// *very* weird bug, importing oai-pmh before search-index causes a segfault
import pkg from 'oai-pmh' // https://github.com/paperhive/oai-pmh
import * as fs from 'fs/promises'

const { OaiPmh } = pkg

console.log("initializing...")

const { PUT, DELETE, DOCUMENT_COUNT } = await si()

var lastRun 

try {
  const msecs = await fs.readFile('lastRun.txt')
  lastRun = new Date(parseInt(msecs.toString(), 10))
} catch {
  lastRun = new Date("1990-01-01")
}

async function main () {
   const dateNow = Date.now()
   const oaiPmh = new OaiPmh('http://philarchive.org/oai.pl')
   const recordIterator = oaiPmh.listRecords({
     metadataPrefix: 'oai_dc',
     from: lastRun.toISOString()
   })
   const options = {
     storeVectors: true
   }
   let count = 0 
   let deletions = 0 
   let total = 0
   const chunk = []
   for await (const record of recordIterator) {
     if (record.header?.['$']?.status === 'deleted') {
       deletions++
       await DELETE(record.header.identifier)
     } else {
       const data = {}
       // We only capture dublin core right now
       const md = record.metadata["oai_dc:dc"]
       // need to strip dc: prefix from fields for search indexing
       data.contributor = md?.["dc:contributor"] 
       data.coverage = md?.["dc:coverage"] 
       data.creator = md?.["dc:creator"] 
       const maybeDate = Date.parse(md?.["dc:date"])
       if (maybeDate) data.date = maybeDate //should convert to unix time for search by range
       data.description = md?.["dc:description"] 
       data.format = md?.["dc:format"] 
       data.identifier = md?.["dc:identifier"] 
       data._id = md?.["dc:identifier"] 
       data.language = md?.["dc:language"] 
       data.publisher = md?.["dc:publisher"] 
       data.relation = md?.["dc:relation"] 
       data.rights = md?.["dc:rights"] 
       data.source = md?.["dc:source"] 
       data.subject = md?.["dc:subject"] 
       data.title = md?.["dc:title"] 
       data.type = md?.["dc:type"] 
       chunk.push(data)
       count++
       total = await DOCUMENT_COUNT()
       console.log(`count: ${count}, total ${total}, deletions ${deletions}`)
     }
     if (chunk.length > 25) {
       const results = await PUT(chunk, options)
       results.map(rslt => {
         if (rslt.status !== "CREATED") console.log(rslt)
       })
       chunk.length = 0
     }
     await fs.writeFile('lastRun.txt',dateNow.toString())
   }
   await PUT(chunk, options)
   console.log(`count: ${count}, total ${total}, deletions ${deletions}`)
}

main().catch(console.error)
