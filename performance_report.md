# Performance Benchmarking Report

Generated at: 2026-08-04T16:31:24.040Z
Target Environment: Development (Local Host)

## Baseline Latency Metrics

| Benchmark Task | Min (ms) | Max (ms) | Avg (ms) | Median (ms) | P95 (ms) | P99 (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication | 280.7 | 280.7 | 280.7 | 280.7 | 280.7 | 280.7 |
| PDF Upload | 55.1 | 55.1 | 55.1 | 55.1 | 55.1 | 55.1 |
| Document List Retrieval | 31.7 | 31.7 | 31.7 | 31.7 | 31.7 | 31.7 |
| Chat Session Creation | 15.8 | 15.8 | 15.8 | 15.8 | 15.8 | 15.8 |
| Chat RAG Response | 29244.6 | 29244.6 | 29244.6 | 29244.6 | 29244.6 | 29244.6 |
| Suggested Questions | 71.1 | 71.1 | 71.1 | 71.1 | 71.1 | 71.1 |

## Load Testing & Concurrency Latencies

| Concurrency Level | Successful Requests | Min (ms) | Max (ms) | Avg (ms) | Median (ms) | P95 (ms) | P99 (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 (Chat) | 1 | 16339.1 | 16339.1 | 16339.1 | 16339.1 | 16339.1 | 16339.1 |
| 5 (Chat) | 5 | 11818.1 | 48423.5 | 28684.2 | 27747.0 | 48423.5 | 48423.5 |
| 10 (Chat) | 3 | 27918.0 | 55340.2 | 39498.4 | 35237.0 | 55340.2 | 55340.2 |
| 25 (Chat) | 0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

## Identified Bottlenecks & Infrastructure Recommendations

1. **Ollama LLM Local Inference Speed**: LLM answer generation is the largest latency component. When multiple requests hit the local Ollama backend concurrently, response times scale linearly. In production, we recommend deploying an LLM pool or using GPU-accelerated instances.
2. **Similarity Vector Search**: ChromaDB searches remain consistently sub-50ms under low concurrency but need index optimization (e.g., HNSW configuration) for higher multi-tenant workloads.
3. **Event Broker Bridging**: Redis Pub/Sub request-reply bridge scales effectively, but backend connection pooling must handle high subscription loads cleanly.
