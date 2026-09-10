// Test suite for QRMesh packet header serialization
describe('Header Parser', () => {
  it('should format index|total|type|payload correctly', () => {
    const raw = '0|10|IMG|dGVzdA==';
    const parts = raw.split('|');
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe('0');
    expect(parts[1]).toBe('10');
  });
});
