# Audio Pre-processing Pipeline

Audio files are resampled using Web Audio API's `OfflineAudioContext` to:
- Sample Rate: 8,000 Hz
- Channels: 1 (Mono)
- Bit Depth: 8-bit PCM
This maximizes optical transmission speed for voice memos.
