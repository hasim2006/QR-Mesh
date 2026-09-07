# Fountain Code Chunk Header Format

Format: `<index>|<total>|<type>|<base64_data>`

- index: 0-indexed chunk position.
- total: Total number of frames in stream.
- type: 'IMG' for images, 'AUD' for audio, 'RAW' for raw text.
- base64_data: Base64 encoded payload fragment.
