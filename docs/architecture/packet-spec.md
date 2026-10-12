# Packet Specification

```typescript
export interface OpticalPacket {
  index: number;
  total: number;
  type: 'IMG' | 'AUD' | 'RAW';
  data: string; // Base64
}
```
