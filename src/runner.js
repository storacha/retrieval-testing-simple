import * as dagJSON from '@ipld/dag-json'

/**
 * @import { TestRunner, GatewayTestResult } from './api.js'
 * @import { UnknownLink } from 'multiformats'
 */

const SAMPLE_API_URL = 'https://up.web3.storage/sample'
const TIMEOUT = 1000 * 60 * 2

/**
 * @param {string[]} gateways
 * @param {{ sampleApiUrl?: URL }} [options]
 * @returns {TestRunner<{}, { [gateway: string]: GatewayTestResult }>}
 */
export const createRunner = (gateways, options) => {
  const gatewayRunners = gateways.map(g => new GatewayTestRunner(g))
  const multiRunner = new MultiTestRunner(gatewayRunners)
  return new SamplingTestRunner(multiRunner, options)
}

/**
 * @template R 
 * @implements {TestRunner<{}, R>}
 */
class SamplingTestRunner {
  #runner
  #url

  /**
   * @param {TestRunner<{ cid: UnknownLink }, R>} runner
   * @param {{ sampleApiUrl?: URL }} [options]
   */
  constructor (runner, options) {
    this.#runner = runner
    this.#url = options?.sampleApiUrl ?? SAMPLE_API_URL
  }

  get id () {
    return `sampling<${this.#url}>`
  }

  async runTest () {
    const res = await fetch(this.#url)
    if (!res.ok) {
      throw new Error(`fetching sample: ${res.status}`)
    }
    /** @type {Array<{ root: UnknownLink }>} */
    const sample = dagJSON.parse(await res.text())
    return this.#runner.runTest({ cid: sample[0].root })
  }
}

/**
 * Combine multiple test runners and collect results by runner ID.
 *
 * @template P
 * @template R
 * @implements {TestRunner<P, R[]>}
 */
class MultiTestRunner {
  #runners

  /** @param {TestRunner<P, R>[]} runners */
  constructor (runners) {
    this.#runners = runners
  }

  get id () {
    return `multi<${this.#runners.map(r => r.id).join('+')}>`
  }

  /** @param {P} params */
  async runTest (params) {
    const results = await Promise.all(this.#runners.map(async r => {
      const result = await r.runTest(params)
      return [r.id, result.results]
    }))
    return { params, results: Object.fromEntries(results) }
  }
}

/** @implements {TestRunner<{ cid: UnknownLink }, GatewayTestResult>} */
class GatewayTestRunner {
  #gateway

  /** @param {string} gateway */
  constructor (gateway) {
    this.#gateway = gateway
  }

  get id () {
    return this.#gateway
  }

  /** @param {{ cid: UnknownLink }} params */
  async runTest (params) {
    const { cid } = params
    const url = `https://${this.#gateway}/ipfs/${cid}`
    const start = Date.now()
    /** @type {number} */
    let ttfb
    let status = 0
    let headers = new Headers()
    let timeoutID
    try {
      const controller = new AbortController()
      timeoutID = setTimeout(() => controller.abort(), TIMEOUT)
      const res = await fetch(url, { signal: controller.signal })
      status = res.status
      headers = res.headers
      controller.abort() // we don't need to read the entire repsonse
    } catch (err) {
      console.error(`requesting: ${url}`, err)
    } finally {
      clearTimeout(timeoutID)
      ttfb = Date.now() - start
    }
    console.log(`${status} ${cid} ${this.#gateway} (${ttfb.toLocaleString()}ms)`)
    return { params, results: { status, headers, ttfb } }
  }
}
