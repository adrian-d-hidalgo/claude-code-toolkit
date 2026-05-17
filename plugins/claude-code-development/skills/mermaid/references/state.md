# stateDiagram-v2

**Notation anchor**: UML 2.5.1 State Machine Diagram (OMG, 2017). Mermaid's `stateDiagram-v2` covers the core constructs (states, transitions, composite states, forks/joins, parallel regions, history).
**Best for**: state machines, lifecycles, status transitions, finite automata.
**Mermaid version**: `stateDiagram-v2` since v9.x; use this, not the legacy `stateDiagram`.

## Syntax skeleton

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed: payment_succeeded
    Pending --> Cancelled: payment_failed
    Confirmed --> Shipped: warehouse_dispatch
    Shipped --> Delivered: courier_confirms
    Delivered --> [*]
    Cancelled --> [*]
```

## States

| Syntax                    | Meaning                     |
| ------------------------- | --------------------------- |
| `[*]`                     | Initial / final pseudostate |
| `StateName`               | Basic state                 |
| `StateName : description` | State with description      |
| `state "Long name" as SN` | Alias for long names        |

## Transitions

```
Source --> Target : event [guard] / action
```

- `event`: trigger that fires the transition.
- `[guard]`: boolean condition that must hold.
- `/action`: side effect on transition.

Multiple elements optional; in practice many transitions use only `event`.

## Composite states

```mermaid
stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Idle
        Idle --> Processing: receive
        Processing --> Idle: done
    }
    Active --> Terminated: shutdown
    Terminated --> [*]
```

Composite states hold sub-state machines. The inner `[*]` is the initial state of the composite, not the diagram.

## Parallel regions

```mermaid
stateDiagram-v2
    state Active {
        [*] --> Network
        Network --> Idle
        Network --> Sending
        --
        [*] --> Battery
        Battery --> Normal
        Battery --> Low
    }
```

`--` inside a composite splits it into orthogonal regions that run in parallel.

## Forks and joins

```mermaid
stateDiagram-v2
    state fork_state <<fork>>
    state join_state <<join>>
    [*] --> fork_state
    fork_state --> StateA
    fork_state --> StateB
    StateA --> join_state
    StateB --> join_state
    join_state --> Done
```

Forks split execution; joins synchronize.

## History states

```mermaid
stateDiagram-v2
    state Active {
        [*] --> History
        state History <<history>>
        History --> Idle
        Idle --> Working
        Working --> Idle
    }
    Active --> Suspended
    Suspended --> Active
```

`<<history>>` resumes the previously-entered substate when the composite is re-entered.

## Notes

```mermaid
stateDiagram-v2
    State1 : description
    note right of State1
        Multi-line note
        on the side.
    end note
```

## Gotchas

- Use `stateDiagram-v2`, not the deprecated `stateDiagram`. Many features (parallel regions, composite history) require v2.
- State names cannot start with a digit; alias long names with `state "..." as Alias`.
- Transition guards use square brackets `[guard]`; do not confuse with Mermaid node label syntax.
- For state machines with >20 states, split into multiple diagrams by phase or aspect. Composite states keep large state machines navigable.

## Worked example — order lifecycle with composite state

```mermaid
stateDiagram-v2
    [*] --> Cart
    Cart --> Pending: checkout
    state Pending {
        [*] --> AwaitingPayment
        AwaitingPayment --> PaymentProcessing: pay_clicked
        PaymentProcessing --> Confirmed: payment_succeeded
        PaymentProcessing --> AwaitingPayment: payment_failed [retries_left]
        PaymentProcessing --> Cancelled: payment_failed [no_retries]
    }
    Confirmed --> Shipped: warehouse_dispatch
    Shipped --> Delivered: courier_confirms
    Shipped --> Returned: customer_returns
    Returned --> Refunded: refund_processed
    Delivered --> [*]
    Refunded --> [*]
    Cancelled --> [*]
```

## Worked example — connection state machine with parallel regions

```mermaid
stateDiagram-v2
    [*] --> Connected
    state Connected {
        [*] --> AuthIdle
        AuthIdle --> AuthRefreshing: token_near_expiry
        AuthRefreshing --> AuthIdle: refresh_ok
        AuthRefreshing --> Disconnected: refresh_failed
        --
        [*] --> NetworkIdle
        NetworkIdle --> Sending: outbound_msg
        Sending --> NetworkIdle: ack
        Sending --> NetworkRetry: timeout
        NetworkRetry --> NetworkIdle: ack
        NetworkRetry --> Disconnected: max_retries
    }
    Connected --> Disconnected: explicit_close
    Disconnected --> [*]
```
