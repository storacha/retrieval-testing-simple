import express from 'express'
import client from 'prom-client'

const app = express()
const port = 3000

/**
 * @type {Record<string, string>}
 */
const gateways = {
  w3s_link: 'w3s.link',
  ipfs_io: 'ipfs.io',
  pinata: 'gateway.pinata.cloud',
  foreverland: '4everland.io'
}

/**
 *
 * @param {string} gateway
 * @param {string} cid
 */
async function cidRetrievabilityStatus(gateway, cid) {
  try {
    const url = `https://${gateway}/ipfs/${cid}`

    const response = await fetch(url)
    if (response.ok) {
      return 1
    }

    return 0
  } catch (error) {
    console.error(error)
    return 0
  }
}

/**
 * @returns {Promise<string[]>}
 */
async function getSampleCidSet() {
  try {
    const response = await fetch('https://up.web3.storage/sample?size=10')
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`)
    }

    const json = await response.json()
    // @ts-ignore TODO: remove
    return json.map(item => item.root['/'])
  } catch (error) {
    console.error(error)
    return []
  }
}

//  dummy version for testing
async function runTest(iterations = 1) {
  /**
   * @type {Record<string, number>}
   */
  const map = {
    w3s_link: 0,
    ipfs_io: 0,
    pinata: 0,
    foreverland: 0
  }

  for (let i = 1; i <= iterations; i++) {
    const sampleCids = await getSampleCidSet()

    for (const cid of sampleCids) {
      for (const gatewayName in gateways) {
        const cidStatus = await cidRetrievabilityStatus(gateways[gatewayName], cid)
        map[gatewayName] += cidStatus
      }
    }
  }

  console.log(map)

  return map
}

const register = new client.Registry()
const collectDefaultMetrics = client.collectDefaultMetrics

// TODO: remove and create custom metric
collectDefaultMetrics({
  register
})

app.get('/test', async (req, res) => {
  try {
    await runTest()
  } catch (error) {
    // @ts-ignore err.message
    res.status(500).send(err.message)
  }
})

// Expose the `/metrics` endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', client.register.contentType)
    let metrics = await register.metrics()
    res.send(metrics)
  } catch (err) {
    // @ts-ignore err.message
    res.status(500).send(err.message)
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
