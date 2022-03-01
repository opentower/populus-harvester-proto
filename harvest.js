import pkg from 'oai-pmh' // https://github.com/paperhive/oai-pmh
import * as fs from 'fs/promises'
const { OaiPmh } = pkg

export default class Harvester {
  constructor({PUT, DELETE, DOCUMENT_COUNT }) {
    this.PUT = PUT
    this.DELETE = DELETE
    this.DOCUMENT_COUNT = DOCUMENT_COUNT
  }

  harvest = async _ => {
    try {
      const msecs = await fs.readFile('storage/lastRun.txt')
      this.lastRun = new Date(parseInt(msecs.toString(), 10))
      this.nextRun = new Date(parseInt(msecs.toString(), 10))
    } catch {
      this.lastRun = new Date("2008-01-01")
      this.nextRun = new Date("2008-01-01")
    }
    const dateNow = Date.now()
    const oaiPmh = new OaiPmh('http://philarchive.org/oai.pl')
    let recordIterator
    let count = 0 
    let deletions = 0 
    let total = 0
    let run = 0
    while (this.nextRun < dateNow) {
      this.lastRun = new Date(this.nextRun)
      this.nextRun.setTime(this.nextRun.getTime() + 2629800000) // one month
      recordIterator = oaiPmh.listRecords({
        metadataPrefix: 'oai_dc',
        from: this.lastRun.toISOString(),
        until: this.nextRun.toISOString()
      })
      const chunk = []
      try {
        run = 0
        for await (const record of recordIterator) {
          if (record.header?.['$']?.status === 'deleted') {
            deletions++
            await this.DELETE(record.header.identifier)
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
            data._id = record.header.identifier 
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
            this.lastHarvest = record.header.datestamp
            this.lastRecord = record.header.identifier
            total = await this.DOCUMENT_COUNT()
            run++
            console.log(`count:${run}/${count} total:${total} deletions:${deletions} timestamp:${this.lastHarvest} id:${record.header.identifier}`)
          }
          if (chunk.length > 25) {
            await this.saveChunk(chunk)
            chunk.length = 0
          }
        }
      } catch (e) {
        if (e.code === "noRecordsMatch") {
          console.log(`nothing for ${this.lastRun} to ${this.nextRun}`)
          if (run > 0) await fs.appendFile('storage/errors.txt', 
            `In-Run-noRecordsMatch at \n${new Date().toString()}` +
            `\nlast harvest:${this.lastHarvest}` +
            `\nlast record:${this.lastRecord}` +
            `\nfrom:${this.lastRun}` +
            `\nuntil:${this.nextRun}` +
            `\nstack: ${e.stack}`) 
        } else throw e
      }
      await this.saveChunk(chunk)
      await fs.writeFile('storage/lastRun.txt', this.lastRun.getTime().toString())
      console.log(`Run from ${this.lastRun} to ${this.nextRun} Complete.`)
    }
    await fs.writeFile('storage/lastRun.txt', dateNow.toString())
  }

  async saveChunk(chunk) {
    const options = { storeVectors: true } 
    const results = await this.PUT(chunk, options)
  }

  safeHarvest = _ => {
    if (this.harvesting) return
    this.harvesting = true
    this.harvest()
    .catch(async e => {
      this.harvesting = false
      console.log("caught")
      await fs.appendFile('storage/errors.txt', 
        `\n${new Date().toString()}` +
        `\nlast harvest:${this.lastHarvest}` +
        `\nlast record:${this.lastRecord}` +
        `\nfrom:${this.lastRun}` +
        `\nuntil:${this.nextRun}` +
        `\nstack: ${e.stack}`) 
      switch (e.name) {
        case "TypeError" : {
          console.log("hitting upstream bug for 1-entry reponses")
          return
        }
        case "OaiPmhError" : {
          console.log(e)
          return
        }
        default : throw e
      }
    })
    .then(_ => this.harvesting = false)
  }
}
