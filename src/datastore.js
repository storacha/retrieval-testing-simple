import client from 'prom-client'

/**
 * @import { Datastore, GatewayTestResult } from './api.js'
 */

/** @param {{ region?: string }} [options] */
export const createPromDatastore = (options) => new PromDatastore(options)

/** @implements {Datastore<{ [gateway: string]: GatewayTestResult }>} */
class PromDatastore {
  #registry
  #region

  #counterTests
  #counterStatus
  #histogramTTFB

  /** @param {{ region?: string }} [options] */
  constructor (options) {
    const registry = new client.Registry()

    this.#registry = registry
    this.#region = options?.region ?? 'unknown'

    this.#counterTests = new client.Counter({
      name: 'retrieval_tests_total',
      help: 'Total number of retrieval tests conducted.',
      labelNames: /** @type {const} */ (['region'])
    })
    registry.registerMetric(this.#counterTests)

    this.#counterStatus = new client.Counter({
      name: 'retrieval_test_status_total',
      help: 'Total tests by response HTTP status code.',
      labelNames: /** @type {const} */ (['status', 'gateway', 'region'])
    })
    registry.registerMetric(this.#counterStatus)

    this.#histogramTTFB = new client.Histogram({
      name: 'retrieval_ttfb_seconds',
      help: 'Time to first byte for retrieval requests.',
      labelNames: /** @type {const} */ (['status', 'gateway', 'region'])
    })
    registry.registerMetric(this.#histogramTTFB)
  }

  /** @param {{ [gateway: string]: GatewayTestResult }} results */
  add (results) {
    this.#counterTests.inc({ region: this.#region })

    for (const [gateway, result] of Object.entries(results)) {
      this.#counterStatus.inc({
        region: this.#region,
        status: result.status,
        gateway,
      })

      this.#histogramTTFB.observe({
        region: this.#region,
        status: result.status,
        gateway,
      }, result.ttfb/1000)
    }
  }

  get registry () {
    return this.#registry
  }
}
