# gantt

**Notation anchor**: Gantt chart (Henry Gantt, 1910s) — bars on a time axis showing task duration, dependencies, milestones.
**Best for**: project timelines, task scheduling, milestone tracking, release planning.
**Mermaid version**: stable since v1.x.

## Syntax skeleton

```mermaid
gantt
    title Q3 release plan
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Design
        Wireframes        :des1, 2026-06-01, 7d
        High-fi mockups   :des2, after des1, 10d

    section Build
        Backend API       :build1, 2026-06-10, 21d
        Frontend          :build2, after build1, 14d

    section Test
        Integration tests :test1, after build2, 5d
        UAT               :test2, after test1, 7d

    section Release
        Code freeze       :milestone, freeze, 2026-08-20, 0d
        Deploy            :milestone, deploy, 2026-08-22, 0d
```

## Header settings

| Setting               | Purpose                     | Examples                               |
| --------------------- | --------------------------- | -------------------------------------- |
| `title <text>`        | Diagram title               |
| `dateFormat <fmt>`    | Input date format           | `YYYY-MM-DD`, `YYYY-MM-DD HH:mm`       |
| `axisFormat <fmt>`    | Display format on axis      | `%b %d`, `%Y-%m`, `%H:%M`              |
| `tickInterval <unit>` | Grid spacing                | `1week`, `5day`, `1month`              |
| `excludes <range>`    | Skip dates                  | `weekends`, `2026-07-04`, `2026-12-25` |
| `includes <date>`     | Force-include excluded date | `2026-07-04`                           |
| `todayMarker off`     | Hide today's vertical line  | `off`                                  |
| `weekday <day>`       | First day of week           | `monday`, `sunday`                     |

## Tasks

```
<label> : [tag,] [id,] <start>, <duration|end>
```

- `id`: optional, used in `after <id>` and dependencies.
- `start`: either an absolute date (`2026-06-01`) or `after <id>` (relative to another task's end).
- `duration`: `5d`, `2w`, `1mo` — days / weeks / months.
- Alternatively, give an `end` date.

| Tag         | Meaning                   |
| ----------- | ------------------------- |
| `done`      | Completed (rendered grey) |
| `active`    | In progress (highlighted) |
| `crit`      | Critical path (red)       |
| `milestone` | Zero-duration marker      |

Combine: `:done, crit, des1, 2026-06-01, 5d`.

## Dependencies

| Form                     | Meaning                              |
| ------------------------ | ------------------------------------ |
| `2026-06-01, 5d`         | Absolute start + duration            |
| `after taskA, 5d`        | Start right after `taskA` ends       |
| `after taskA taskB, 5d`  | Start after **all** listed tasks end |
| `2026-06-01, 2026-06-15` | Absolute start + end                 |

## Sections

```
section <name>
    <task lines>
```

Sections group tasks visually with section headers on the left. Use one section per phase or team.

## Gotchas

- `dateFormat` and `axisFormat` must agree on time granularity. Mixing `YYYY-MM-DD` input with `%H:%M` axis renders empty.
- `excludes weekends` shifts dependent tasks forward; recompute deadlines if you toggle this on/off mid-edit.
- Milestone tasks must have `0d` duration; non-zero milestones render as bars instead of markers.
- Gantt is for **planned** schedules. For executed progress, use `done` and `active` tags but pair the diagram with a status doc — Gantt does not track actuals.
- For schedules with >50 tasks, split per phase or per team across multiple diagrams.

## Worked example — release with critical path and milestones

```mermaid
gantt
    title 2026-Q3 marketplace launch
    dateFormat YYYY-MM-DD
    axisFormat %b %d
    excludes weekends

    section Discovery
        Customer interviews :done, disc1, 2026-06-01, 2w
        Synthesis           :done, disc2, after disc1, 3d

    section Design
        IA + wireframes     :active, des1, after disc2, 1w
        Hi-fi mockups       :des2, after des1, 2w
        Design review       :milestone, review, after des2, 0d

    section Build
        Auth + Accounts     :crit, b1, after review, 3w
        Catalog + Search    :crit, b2, after b1, 4w
        Checkout + Payments :crit, b3, after b2, 3w

    section Test
        Integration         :t1, after b3, 1w
        UAT                 :t2, after t1, 1w
        Bug-fix cycle       :t3, after t2, 1w

    section Release
        Code freeze         :milestone, freeze, after t3, 0d
        Soft launch         :milestone, soft, 2026-08-25, 0d
        Public launch       :milestone, launch, 2026-09-01, 0d
```

## Worked example — multi-team parallel work

```mermaid
gantt
    title Mobile + Backend sprint plan
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Mobile team
        Onboarding screens     :m1, 2026-07-01, 5d
        Profile screens        :m2, after m1, 5d
        Payments UI            :m3, after m2, 8d

    section Backend team
        Auth refactor          :b1, 2026-07-01, 8d
        Profile API            :b2, after b1, 4d
        Payments API           :b3, after b2, 6d

    section Integration
        Profile end-to-end     :i1, after m2 b2, 3d
        Payments end-to-end    :crit, i2, after m3 b3, 4d

    section Release
        QA pass                :q1, after i2, 5d
        Submit to stores       :milestone, submit, after q1, 0d
        Approval window        :app, after submit, 5d
        Launch                 :milestone, launch, after app, 0d
```

The `after m3 b3` (two tasks) shows that integration starts only after both feature streams complete.
