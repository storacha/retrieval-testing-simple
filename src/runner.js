import * as dagJSON from '@ipld/dag-json'

/**
 * @import { TestRunner, GatewayTestParams, GatewayTestResult, TestSummary } from './api.js'
 * @import { UnknownLink } from 'multiformats'
 */

const MAX_SAMPLE_SIZE = 10
const SAMPLE_API_URL = 'https://up.web3.storage/sample'
const TIMEOUT = 1000 * 60 * 2

/**
 * @param {string[]} gateways
 * @param {{ sampleApiUrl?: URL }} [options]
 * @returns {TestRunner<{}, { [gateway: string]: TestSummary<GatewayTestParams, GatewayTestResult> }>}
 */
export const createRunner = (gateways, options) => {
  const gatewayRunners = gateways.map(g => new GatewayTestRunner(g))
  const multiRunner = new MultiTestRunner(gatewayRunners)
  return new SamplingTestRunner(gatewayRunners.length, multiRunner, options)
}

/**
 * @template R 
 * @implements {TestRunner<{}, R>}
 */
class SamplingTestRunner {
  #runner
  #url
  #size

  /**
   * @param {number} size
   * @param {TestRunner<Array<{ root: UnknownLink }>, R>} runner
   * @param {{ sampleApiUrl?: URL }} [options]
   */
  constructor (size, runner, options) {
    this.#size = size
    if (this.#size > MAX_SAMPLE_SIZE) throw new Error('max sample size exceeded')
    this.#runner = runner
    this.#url = options?.sampleApiUrl ?? SAMPLE_API_URL
  }

  get id () {
    return `sampling_x${this.#size}<${this.#url}>`
  }

  async runTest () {
    const url = new URL(this.#url)
    url.searchParams.set('size', this.#size.toString())

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`fetching sample: ${res.status}`)
    }

    /** @type {Array<{ root: UnknownLink }>} */
    const sample = dagJSON.parse(await res.text())
    return this.#runner.runTest(sample)
  }
}

/**
 * Combine multiple test runners and collect results by runner ID. Tests are run
 * in serial in the order passed to the constructor.
 *
 * @template P
 * @template R
 * @implements {TestRunner<P[], { [id: string]: TestSummary<P, R> }>}
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

  /** @param {P[]} params */
  async runTest (params) {
    /** @type {{ [id: string]: TestSummary<P, R> }} */
    const results = {}
    await Promise.all(params.map(async (p, i) => {
      const r = this.#runners[i]
      if (!r) return
      const result = await r.runTest(p)
      results[r.id] = result
    }))
    return { params, results }
  }
}

/** @implements {TestRunner<GatewayTestParams, GatewayTestResult>} */
class GatewayTestRunner {
  #gateway

  /** @param {string} gateway */
  constructor (gateway) {
    this.#gateway = gateway
  }

  get id () {
    return this.#gateway
  }

  /** @param {{ root: UnknownLink }} params */
  async runTest (params) {
    const { root } = params
    const url = `https://${this.#gateway}/ipfs/${root}`
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
    return { params, results: { status, headers, ttfb } }
  }
}
