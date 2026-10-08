# Observability-first debugging

Source: Charity Majors, Liz Fong-Jones, George Miranda, _Observability Engineering_ (O'Reilly, 2022).

## Why observability before code reading

In production, the dominant debugging cost is **finding where to look**. Code reading is dense; logs are noisy; metrics are summaries. **Distributed traces** show exactly which request is slow, which service spent the time, which span errored — in seconds.

Order of investigation when a production symptom is reported:

1. **Trace first** — open a representative slow / failed request in the tracing UI. See the span breakdown. Identify the dominant span.
2. **Metric next** — confirm the symptom is real and scoped (1% of requests? 100%? specific region?).
3. **Logs last** — only after trace + metric have narrowed the location, dive into structured logs with the trace_id as filter.

This inversion is non-obvious for engineers trained pre-observability (reading code first). Charity Majors' formulation: "logs are just spans without structure — start with the structured view".

## When you don't have traces

If the system isn't instrumented, the first hypothesis to test is **lack-of-observability is the bug**: until the path is traced, debugging is guesswork. Either:

- Quickly add instrumentation (OpenTelemetry SDK in 30 lines) and reproduce.
- Or use whatever proxies exist (CloudWatch latency histograms, K8s pod metrics, NLB target health) as substitutes.

The investigation report should note "no per-request tracing available; relying on aggregate metrics, accuracy limited" — tag findings as `[Inference]` rather than `[Verified]`.

## Three pillars: when each is the fastest signal

| Pillar      | Best for                                                        | Example signal                                         |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| **Traces**  | One bad request: where did the time go? which span errored?     | Trace ID `abc123`: `payment-gateway.charge` span 28.4s |
| **Metrics** | Is the symptom widespread? Has it been getting worse over time? | p95 latency went from 80 ms to 1200 ms at 14:00 UTC    |
| **Logs**    | Specific events / errors with full context                      | `error="connection refused" target=auth-svc:8443`      |

A common production debug starts trace → metric → logs in sequence:

1. Trace shows `auth-svc.validateToken` span took 12 s.
2. Metric confirms auth-svc latency p95 is 12 s right now, was 50 ms an hour ago.
3. Logs reveal `auth-svc` connection-pool exhausted; one slow downstream call holding many connections.

Each step narrows the scope cheaply.

## Cardinality and high-cardinality fields

When the symptom is "happens for specific users / specific tenants / specific products", you need **high-cardinality** observability:

- Trace attributes: `user_id`, `tenant_id`, `feature_flag_state`, `request_path`.
- Honeycomb / Lightstep / structured-traces-with-arbitrary-attributes — these excel here.
- Prometheus / metrics dashboards alone WON'T solve high-cardinality questions (cardinality limits make per-user metrics impractical).

If your stack is Prom-only and the symptom is "happens for specific users", investigation needs supplementing — usually via logs with the user_id field indexed, or by adding tracing.

## Observability anti-patterns during debugging

- **Reading logs first**: noisy, unindexed, easy to get lost. Traces and metrics narrow scope first.
- **Searching for `error` strings**: most production bugs don't log "error" at the failure site. Search by trace_id / user_id / endpoint instead.
- **Treating dashboards as the ground truth**: dashboards are pre-aggregated, may not reflect what's happening in the last 30 seconds, may not include the specific axis you need. Use them for context, not for drill-down.
- **Ignoring logging gaps**: if the trace shows a span ending at the network boundary with no further detail, the downstream service likely lacks instrumentation. Note this gap in the investigation log; consider an action item to add instrumentation as part of prevention.

## Output integration

In the `debugging-protocol` output, the **Evidence collected** section cites observability findings with their evidence levels:

- `E-NN: payment-gateway.charge span = 28.4s for trace-id abc123 [Verified — trace UI link]`
- `E-NN: p95 latency 1200ms across all checkout requests since 14:00 UTC [Verified — grafana/d/checkout p95 panel]`
- `E-NN: No per-user latency metrics available; assumption that this affects all users vs specific users [Unverified — verify by adding user_id to tracing attributes]`

## Cross-reference

- For systematic hypothesis testing: [`hypothesis-driven.md`](./hypothesis-driven.md).
- For regressions tied to commits: [`git-bisect.md`](./git-bisect.md).
- Once root cause is found, prevention design via `../../bug-analysis/SKILL.md`.
