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
const authToken = process.env.AUTH_TOKEN
if (!authToken) throw new Error('missing environment variable: AUTH_TOKEN')

const runner = createRunner(gateways, { sampleApiUrl })
const datastore = createPromDatastore({ region })
const server = createPromServer(datastore.registry, authToken)

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

while (true) {
  const summary = await runner.runTest({})
  for (const [gateway, { params, results }] of Object.entries(summary.results)) {
    const stdio = results.status === 200 ? 'log' : 'error'
    const msg = `${results.status} ${params.root} ${gateway} (${results.ttfb.toLocaleString()}ms)`
    console[stdio](msg)
  }
  datastore.add(summary.results)
  await new Promise(resolve => setTimeout(resolve, interval))
}
