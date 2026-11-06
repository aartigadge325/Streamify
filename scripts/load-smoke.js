'use strict';

const baseUrl = new URL(process.env.LOAD_TEST_BASE_URL || 'http://localhost:5000');
const requestPath = process.env.LOAD_TEST_PATH || '/api/v1/videos?page=1&limit=20';
const totalRequests = Number.parseInt(process.env.LOAD_TEST_REQUESTS || '50', 10);
const concurrency = Number.parseInt(process.env.LOAD_TEST_CONCURRENCY || '5', 10);

if (!['http:', 'https:'].includes(baseUrl.protocol)) {
  throw new Error('LOAD_TEST_BASE_URL must use http or https');
}
if (!Number.isInteger(totalRequests) || totalRequests < 1 || totalRequests > 1000) {
  throw new Error('LOAD_TEST_REQUESTS must be an integer between 1 and 1000');
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 25) {
  throw new Error('LOAD_TEST_CONCURRENCY must be an integer between 1 and 25');
}
if (!requestPath.startsWith('/') || requestPath.startsWith('//')) {
  throw new Error('LOAD_TEST_PATH must be an absolute path beginning with one slash');
}

const target = new URL(requestPath, baseUrl);
if (target.origin !== baseUrl.origin) {
  throw new Error('LOAD_TEST_PATH must stay on the configured base URL origin');
}

const durations = [];
const failures = [];
let nextRequest = 0;
const startedAt = performance.now();

async function worker() {
  while (nextRequest < totalRequests) {
    const requestNumber = nextRequest++;
    const requestStartedAt = performance.now();
    try {
      const response = await fetch(target, { headers: { Accept: 'application/json' } });
      await response.arrayBuffer();
      durations[requestNumber] = performance.now() - requestStartedAt;
      if (!response.ok) failures.push(`#${requestNumber + 1}: HTTP ${response.status}`);
    } catch (error) {
      durations[requestNumber] = performance.now() - requestStartedAt;
      failures.push(`#${requestNumber + 1}: ${error.message}`);
    }
  }
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

async function main() {
  console.log(`GET ${target}`);
  console.log(`${totalRequests} requests, concurrency ${concurrency}`);
  await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, worker));
  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  console.log(`Completed: ${totalRequests - failures.length}/${totalRequests}`);
  console.log(`Elapsed: ${elapsedSeconds.toFixed(2)}s; throughput: ${(totalRequests / elapsedSeconds).toFixed(1)} requests/s`);
  console.log(`Latency: p50 ${percentile(durations, 0.50).toFixed(1)} ms; p95 ${percentile(durations, 0.95).toFixed(1)} ms; max ${Math.max(...durations).toFixed(1)} ms`);
  if (failures.length) {
    console.error(`Failures (${failures.length}):`);
    for (const failure of failures.slice(0, 10)) console.error(`- ${failure}`);
    if (failures.length > 10) console.error(`- plus ${failures.length - 10} more`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
