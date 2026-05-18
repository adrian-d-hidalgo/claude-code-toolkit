# Tech-spec canonical template — full 16 sections

This reference documents the **content structure** of a tech spec. The caller decides where to save (file, wiki, ticket body, doc attachment). The spec **does not impose a filename**; common practice is `tech-spec-<kebab-name>.md` inside `docs/specs/` if the project saves as files, but the skill does not enforce that.

For low-risk / small-scope changes, a **lite spec** collapses to 6 sections (see §17 below).

---

## 1. Summary

2–4 sentences. What's being built, at the technical level. Audience: an engineer who hasn't read the PRD; this section gives them enough to skim the rest.

**Example**:

> Adds a `is_redeemable` derived column to `discount_codes` enabling O(1) redemption checks at checkout. Implements expand-contract migration with a feature flag for read-path swap. Targets p95 < 50 ms for redemption check at 5 k RPS.

## 2. PRD Context (one paragraph max)

Brief reference to the customer problem and PRD goals — link to PRD for full context. **Do NOT restate the entire PRD.**

## 3. Goals & Non-Goals (technical)

**Technical goals** (concrete, measurable):

- Process orders at p95 < 300 ms at 5 k req/s sustained, 15 k peak.
- Zero data loss during checkout.
- Migration runs within the 5-minute weekly maintenance window.

**Technical non-goals** (explicit out-of-scope to prevent scope creep):

- International tax calculation (deferred — see ADR-0050).
- Multi-currency display.

## 4. Architecture (C4)

### 4.1 System Context (C4 Level 1)

Mermaid `C4Context` diagram via the `mermaid` skill. External actors + external systems + this system as a black box.

### 4.2 Container Diagram (C4 Level 2)

Mermaid `C4Container` showing deployable units, tech choices, communications.

### 4.3 Key Components (C4 Level 3 — only when needed)

`C4Component` for non-trivial containers. Most specs do NOT need Level 3 for every container.

### 4.4 Major Decisions

List decisions with link to ADRs. Don't re-argue them here.

- ADR-0042: Use Postgres for transactional state.
- ADR-0043: Use SNS + SQS for fan-out events.

## 5. API Contracts

### 5.1 External-facing APIs

For each public / consumer-facing endpoint:

```yaml
POST /api/v1/orders
auth: Bearer JWT, scope: orders:create
request:
  type: object
  required: [customer_id, items, shipping_address]
  properties:
    customer_id: { type: string, format: uuid }
    items:
      type: array
      minItems: 1
      items:
        type: object
        required: [sku, qty]
        properties:
          sku: { type: string, pattern: '^[A-Z0-9-]+$' }
          qty: { type: integer, minimum: 1, maximum: 100 }
responses:
  201: { schema: OrderCreatedResponse }
  400: { schema: ValidationError }
  409: { schema: ConflictError, description: idempotency conflict }
  422: { schema: BusinessRuleError }
rate_limit: 100/min/user
idempotency_key: required
```

### 5.2 Internal APIs / Events

Service-to-service contracts: gRPC / async events / message schemas. OpenAPI 3.1 / AsyncAPI 2.6 / Protobuf snippets — actual specs, not prose.

## 6. Data Model

### 6.1 New tables / collections

For each:

```
Table `orders`
| Column       | Type        | Constraints                  | Notes                          |
| ------------ | ----------- | ---------------------------- | ------------------------------ |
| id           | UUID        | PK                           | gen_random_uuid() default     |
| customer_id  | UUID        | FK → customers.id            |                                |
| status       | text        | NOT NULL, CHECK IN (...)    |                                |
| created_at   | timestamptz | NOT NULL DEFAULT now()      |                                |

Indexes: idx_orders_customer_id, idx_orders_status_created_at
Partitioning: by created_at month (if applicable)
Migration: forward-compatible, expand-contract pattern
```

### 6.2 Migrations

Use expand-contract (per `claude-code-development:development-plan/references/pr-sequencing.md` §1):

- Step 1 (release N): add new columns nullable.
- Step 2 (release N+1): backfill via background job; verify parity.
- Step 3 (release N+2): make NOT NULL, drop old columns.

## 7. Sequence Flows

For each non-trivial flow, Mermaid `sequenceDiagram`. Cover happy path + key failure modes. Use the `mermaid` skill.

## 8. Deployment & Topology

- Runtime: language / runtime, version.
- Deploy target: K8s cluster, Lambda, etc.
- Resources per instance: CPU, memory, storage.
- Scaling: HPA on what metric, min / max instances.
- Multi-region: yes / no, replication strategy.
- Cost estimate: $/month at expected scale (cite source data with evidence level).

## 9. Observability Plan

### 9.1 SLIs / SLOs

```
| SLI                              | Definition               | Target  | Error budget         |
| -------------------------------- | ------------------------ | ------- | -------------------- |
| API success rate                 | non-5xx / total          | 99.9%   | 0.1% over 30d        |
| API p95 latency                  | 95th percentile / 5m bin | < 300ms | 1% of bins over 30d  |
```

### 9.2 Metrics emitted

Prometheus / Datadog metric names, types, labels.

### 9.3 Logs

Structured fields, log levels, correlation via `trace_id`.

### 9.4 Traces

Spans, attributes per OpenTelemetry semantic conventions.

### 9.5 Alerts

Multi-window multi-burn-rate per SLO; never raw threshold alerts.

## 10. Security & Privacy

For non-trivial security surface: invoke the `claude-code-development:threat-model` skill and reference its output. For trivial cases, include the abbreviated content inline.

### 10.1 Authentication & Authorization

- Auth method: …
- Authorization model: RBAC / ABAC / …
- Token lifecycle: …

### 10.2 Data classification & handling

- PII fields: [list].
- Encryption at rest: yes / no, method.
- Encryption in transit: TLS 1.3.
- Retention: policy + automated enforcement.

### 10.3 Compliance scope

GDPR / HIPAA / PCI / SOC 2 / EU AI Act — what applies and what controls each implies.

### 10.4 Supply chain

- SBOM produced: yes / no.
- Image signing: Cosign keyless.
- SLSA target: L3.

## 11. Performance & Capacity

- Expected load: requests / s, queries / s, payload sizes.
- Capacity headroom: factor above peak.
- Saturation points: where the system breaks first.
- Load-test plan: tooling, scenarios, targets.

## 12. Failure Modes & Recovery

```
| Failure         | Detection                  | Mitigation                     | Recovery       |
| --------------- | -------------------------- | ------------------------------ | -------------- |
| DB failover     | Patroni health check       | App retries with backoff       | Automatic <30s |
| Region outage   | External health probe      | DNS failover                   | Manual RTO 1h  |
| Bad deploy      | Canary metric breach       | Argo Rollouts auto-rollback    | <2 min         |
```

## 13. Rollout Plan

### 13.1 Phases

1. Phase 1 — Internal beta: feature flag for employees, canary 1% traffic.
2. Phase 2 — Closed beta: 10 customers, monitoring SLIs.
3. Phase 3 — Open rollout: progressive 10% → 50% → 100%.
4. Phase 4 — Cleanup: remove feature flag, deprecated code.

### 13.2 Feature flags

- Flag name: `enable-new-checkout-v2`.
- Default: off.
- Targeting: per phase above.
- **Cleanup task scheduled**: per `development-plan/references/pr-sequencing.md` §2 — flag without scheduled cleanup is an anti-pattern.

### 13.3 Migration

If migrating data or contracts: expand-contract steps with rollback at each. Reference `development-plan/references/pr-sequencing.md` §1.

### 13.4 Rollback

- Trigger: SLO burn rate > X for Y minutes.
- Method: feature flag off + revert deploy.
- Estimated time to rollback: < 5 min.

## 14. Open Questions

- [ ] Question requiring decision before / during implementation.

## 15. References

- PRD: <link>.
- Related ADRs: ADR-NNNN, ADR-NNNN.
- Existing systems: code paths, dashboards, runbooks.
- External standards / RFCs.
- Sequence diagrams: see `mermaid` outputs.

## 16. Approvals

Whatever lifecycle the project uses (sign-off matrix, review queue, etc.) wraps the spec — caller's job. The spec itself does NOT carry a `Status:` field.

---

## §17 — Lite-spec collapse

For low-risk / small-scope changes, collapse to **6 sections**:

1. Summary.
2. Architecture (C4 L1 + L2 only).
3. API contracts.
4. Data model.
5. Rollout (with rollback).
6. Risks (top 3, with evidence levels).

Skip §2 (PRD Context), §3 (Goals & Non-Goals — implied by PRD), §7 (Sequence Flows — only if non-trivial), §9 (Observability — must still link to org default), §10 (Security — only if surface is non-trivial), §11 (Performance — only if outside default budget), §12 (Failure Modes — only if non-standard), §14 (Open Questions — fold into Risks), §15 (References — keep PRD link inline), §16 (Approvals — caller's lifecycle).

When in doubt, prefer full spec — the cost of structure is low compared to the cost of missing a section that mattered.
