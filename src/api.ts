/** TestRunner runs a test using the provided parameters. */
export interface TestRunner<P, R> {
  /** Identifier for this runner. */
  id: string
  /** Runs a test with the provided parameters. */
  runTest (params: P): Promise<TestSummary<P, R>>
}

/** Details of the test and its result(s). */
export interface TestSummary<P, R> {
  /** Test conditions. */
  params: P
  /** The result of running the test with the parameters. */
  results: R
}

/** Result of the test for a single gateway. */
export interface GatewayTestResult {
  /** HTTP status code. */
  status: number
  /** HTTP response headers. */
  headers: Headers
  /** Time to first byte (ms). */
  ttfb: number
}

/** Datastore aggretates test results into metrics that can be graphed. */
export interface Datastore<R> {
  add (result: R): void
}
