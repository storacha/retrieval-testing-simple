import express from 'express'
import bearerToken from 'express-bearer-token'

/**
 * @param {import('prom-client').Registry} registry 
 * @param {string} token
 * @returns 
 */
export const createPromServer = (registry, token) => {
  const app = express()
  app.use(bearerToken())
  app.use((req, res, next) => {
    if (req.token !== token) {
      res.status(401).send('Unauthorized')
    } else {
      next()
    }
  })
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
