# sequenceDiagram

**Notation anchor**: UML 2.5.1 Sequence Diagram (OMG, 2017). Mermaid implements a subset focused on common message-passing patterns.
**Best for**: API calls, authentication flows, message passing between actors over time.
**Mermaid version**: stable since v1.x.

## Syntax skeleton

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant DB
    User->>Frontend: Submit credentials
    Frontend->>API: POST /login
    API->>DB: Validate user
    DB-->>API: User record
    API-->>Frontend: JWT token
    Frontend-->>User: Redirect to dashboard
```

## Participants

| Syntax                                    | Meaning                               |
| ----------------------------------------- | ------------------------------------- |
| `actor Name`                              | Human / external actor (stick figure) |
| `participant Name`                        | System / service                      |
| `participant Name as Display`             | Alias for long names                  |
| `participant Name#5`                      | Specific position in the diagram      |
| `box "Group" participant A participant B` | Group participants in a labeled box   |
| `create participant Name`                 | Show creation mid-diagram             |
| `destroy participant Name`                | Show destruction mid-diagram          |

## Message arrows

| Syntax        | Meaning                                        |
| ------------- | ---------------------------------------------- |
| `A->>B: msg`  | Solid arrow (async or simple call)             |
| `A-->>B: msg` | Dashed arrow (response)                        |
| `A-)B: msg`   | Solid open arrow (async, no response expected) |
| `A--)B: msg`  | Dashed open arrow (async response)             |
| `A-xB: msg`   | Solid with X (failed / lost message)           |
| `A--xB: msg`  | Dashed with X (failed response)                |

## Activations

```mermaid
sequenceDiagram
    A->>+B: request
    B-->>-A: response
```

The `+` activates B (shows it processing); the `-` deactivates. Use to show concurrency / lifetimes.

## Combined fragments

```mermaid
sequenceDiagram
    A->>B: hello

    alt success
        B-->>A: 200 OK
    else timeout
        B-->>A: 504
    end

    opt logged in
        B->>DB: read profile
    end

    loop every 30s
        A->>B: heartbeat
    end

    par parallel calls
        A->>B: call X
    and
        A->>C: call Y
    end

    critical mutex section
        B->>DB: write
    option network fails
        B->>A: retry
    end
```

`alt`, `opt`, `loop`, `par`, `critical`, `break` are all valid.

## Notes

```mermaid
sequenceDiagram
    A->>B: hello
    Note over A,B: This is between A and B
    Note left of A: Note on A's side
    Note right of B: Note on B's side
```

## Gotchas

- Participant order is **left-to-right** in declaration order. Reorder declarations to swap visual position.
- Use `actor` for humans, `participant` for systems — visual stick figure / box matters.
- `-->>-` (deactivation in response) is common but easy to miss; double-check activations balance.
- For long flows, prefer `box` groups to keep related participants visually together.

## Worked example — OAuth 2.1 authorization code flow with PKCE

```mermaid
sequenceDiagram
    actor User
    participant App as Native App
    participant Browser
    participant Auth as Auth Server
    participant API
    User->>App: Open app
    App->>App: Generate code_verifier + code_challenge
    App->>Browser: Open /authorize with code_challenge
    Browser->>Auth: GET /authorize
    Auth-->>Browser: Login page
    User->>Browser: Enter credentials
    Browser->>Auth: POST credentials
    Auth-->>Browser: Redirect with code
    Browser-->>App: Deep link with code
    App->>+Auth: POST /token (code + code_verifier)
    Auth->>Auth: Verify challenge against verifier
    Auth-->>-App: access_token + refresh_token
    App->>+API: GET /me (Bearer token)
    API-->>-App: user profile
```

## Worked example — distributed transaction (saga)

```mermaid
sequenceDiagram
    participant Order
    participant Payment
    participant Inventory
    participant Notif

    Order->>Payment: ChargeRequested
    activate Payment
    Payment-->>Order: ChargeSucceeded
    deactivate Payment

    Order->>Inventory: ReserveStock
    activate Inventory
    alt stock available
        Inventory-->>Order: StockReserved
    else stock missing
        Inventory-->>Order: StockUnavailable
        Order->>Payment: Compensate (refund)
        Payment-->>Order: Refunded
        Note over Order: Saga aborted
    end
    deactivate Inventory

    Order->>Notif: NotifyCustomer
```
