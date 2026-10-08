# classDiagram

**Notation anchor**: UML 2.5.1 Class Diagram (OMG, 2017). Mermaid implements a usable subset; advanced UML stereotypes / deployment require PlantUML.
**Best for**: OOP design, type relationships, inheritance, interfaces.
**Mermaid version**: stable since v1.x.

## Syntax skeleton

```mermaid
classDiagram
    class Order {
        +UUID id
        +Date createdAt
        -String status
        +place()
        +cancel()
    }
    class Customer {
        +UUID id
        +String email
    }
    Customer "1" --> "0..*" Order : places
```

## Visibility

| Symbol | Meaning            |
| ------ | ------------------ |
| `+`    | Public             |
| `-`    | Private            |
| `#`    | Protected          |
| `~`    | Package / internal |

## Relationships

| Syntax      | UML relationship                                         |
| ----------- | -------------------------------------------------------- |
| `A <\|-- B` | B inherits from A (inheritance / extension)              |
| `A *-- B`   | A composed of B (composition — B cannot exist without A) |
| `A o-- B`   | A aggregates B (aggregation — B can exist independently) |
| `A --> B`   | A associates with B (general directed association)       |
| `A -- B`    | A and B linked (undirected association)                  |
| `A ..> B`   | A depends on B (dependency, dashed)                      |
| `A ..\|> B` | A implements interface B                                 |
| `A --* B`   | Composition (other direction)                            |

Multiplicity on either side: `"1"`, `"0..1"`, `"*"`, `"1..*"`, `"0..*"`. Place between class name and relationship.

## Annotations

```mermaid
classDiagram
    class Repository {
        <<interface>>
        +findById(id)
        +save(entity)
    }
    class Animal {
        <<abstract>>
        +breathe()
    }
    class Singleton {
        <<singleton>>
    }
```

Use `<<...>>` for `interface`, `abstract`, `enumeration`, custom stereotypes (`<<service>>`, `<<repository>>`).

## Generics

```mermaid
classDiagram
    class List~T~ {
        +add(item: T)
        +get(index): T
    }
    class Repository~Entity, Id~
```

Tilde-delimited type parameters.

## Namespaces (Mermaid v10.7+)

```mermaid
classDiagram
    namespace Domain {
        class Order
        class Customer
    }
    namespace Infrastructure {
        class OrderRepository
    }
    OrderRepository ..> Order : persists
```

Use namespaces to visually group classes by bounded context or layer.

## Gotchas

- Forward-slash and backslash directions matter: `<|--` is **B extends A**, `--|>` is **A extends B**. Easy to flip.
- Method signatures must be on their own line inside `{ ... }`. Put `+method()` not `method()` (visibility leads to inheritance confusion).
- For very large diagrams (>30 classes), prefer multiple diagrams by bounded context. Mermaid renders large class diagrams legibly only up to ~30 nodes.
- Deployment, component, and timing diagrams from UML are **not** in Mermaid — use PlantUML for those.

## Worked example — repository pattern

```mermaid
classDiagram
    class Repository~T~ {
        <<interface>>
        +findById(id): T
        +findAll(): List~T~
        +save(entity: T): T
        +delete(id): void
    }
    class OrderRepository {
        -DataSource db
        +findById(id): Order
        +findAll(): List~Order~
        +save(entity: Order): Order
        +delete(id): void
        +findByCustomer(customerId): List~Order~
    }
    class Order {
        +UUID id
        +Date createdAt
        +status: OrderStatus
    }
    class OrderStatus {
        <<enumeration>>
        PENDING
        CONFIRMED
        SHIPPED
        DELIVERED
        CANCELLED
    }
    Repository <|.. OrderRepository : implements
    OrderRepository --> Order : manages
    Order --> OrderStatus
```

## Worked example — hexagonal architecture layers

```mermaid
classDiagram
    namespace Domain {
        class Order
        class OrderService
        class OrderRepositoryPort {
            <<interface>>
        }
    }
    namespace Application {
        class PlaceOrderUseCase
    }
    namespace Infrastructure {
        class PostgresOrderRepository
        class HttpOrderController
    }
    OrderService --> OrderRepositoryPort : uses
    PostgresOrderRepository ..|> OrderRepositoryPort : implements
    PlaceOrderUseCase --> OrderService
    HttpOrderController --> PlaceOrderUseCase
```
