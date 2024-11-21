import { gateways } from './constants.js'
import { createPromDatastore } from './datastore.js'
import { createRunner } from './runner.js'
import { createPromServer } from './server.js'

const sampleApiUrl = process.env.SAMPLE_API_URL
  ? new URL(process.env.SAMPLE_API_URL)
  : undefined
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const interval = process.env.INTERVAL ? parseInt(process.env.INTERVAL) : (1000 * 60)
const region = process.env.REGION

const runner = createRunner(gateways, { sampleApiUrl })
const datastore = createPromDatastore({ region })
const server = createPromServer(datastore.registry)

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

while (true) {
  const summary = await runner.runTest({})
  datastore.add(summary.results)
  await new Promise(resolve => setTimeout(resolve, interval))
}
