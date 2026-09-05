# Optical Air-Gap Data Transmission Pipeline

QRMesh transmits binary files across physical space using screen photons and camera frame processing.
1. Binary pre-processing and downsampling.
2. Zlib DEFLATE compression via pako.
3. Level H Reed-Solomon QR frame encoding.
4. Optical capture and unordered reassembly.
