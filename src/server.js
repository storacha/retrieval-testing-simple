import express from 'express'

/**
 * @param {import('prom-client').Registry} registry 
 * @returns 
 */
export const createPromServer = (registry) => {
  const app = express()
  app.get('/metrics', async (req, res) => {
    try {
      res.setHeader('Content-Type', registry.contentType)
      const metrics = await registry.metrics()
      res.send(metrics)
    } catch (/** @type {any} */ err) {
      console.error(err)
      res.status(500).send(err.message)
    }
  })
  return app
}
