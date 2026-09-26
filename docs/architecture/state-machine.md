# State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Ingestion : File Selected
    Ingestion --> Compressing : Resample & Deflate
    Compressing --> Transmitting : QR Loop Active
    Transmitting --> Idle : Stop
```
