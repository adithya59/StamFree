# Backend: Flask API Reference

Complete documentation of all REST endpoints for the StamFree Flask backend server.

**Base URL**: `http://localhost:5000` (development) or Cloud Run URL (production)

**Authentication**: Currently none (relies on obscurity). Production should add API key authentication.

---

## Endpoints

### POST `/analyze/snake`

Analyzes a snake game audio clip for prolongation fluency.

**Request:**
```json
{
  "audio_file": "<base64-encoded WAV or M4A>",
  "phoneme_target": "m",
  "game_type": "snake"
}
```

**Response (Pass):**
```json
{
  "pass": true,
  "fluency_category": "fluent",
  "confidence": 0.92,
  "duration_ms": 2150,
  "pitch_variation": 8,
  "amplitude_variation": 2.1,
  "feedback": "Great prolongation!",
  "metrics": {
    "amplitude_sustained": true,
    "duration_sec": 2.15,
    "phonemeMatch": true,
    "repetition": false,
    "noiseDetected": false,
    "voicedRatio": 0.95
  }
}
```

**Response (Fail):**
```json
{
  "pass": false,
  "fluency_category": "blocking",
  "confidence": 0.71,
  "duration_ms": 800,
  "feedback": "Start gently—easy onset!",
  "metrics": { ... }
}
```

---

### POST `/analyze/turtle`

Analyzes a turtle game audio clip for rate control (WPM).

**Request:**
```json
{
  "audio_file": "<base64-encoded WAV>",
  "targetText": "I like to play games",
  "tier": 1,
  "game_type": "turtle"
}
```

**Response (Pass):**
```json
{
  "pass": true,
  "wpm": 95,
  "transcript": "I like to play games",
  "confidence": 0.89,
  "words": [
    {"word": "I", "start_time": 0.1, "end_time": 0.3},
    {"word": "like", "start_time": 0.4, "end_time": 0.7},
    {"word": "to", "start_time": 0.9, "end_time": 1.1},
    {"word": "play", "start_time": 1.3, "end_time": 1.6},
    {"word": "games", "start_time": 1.8, "end_time": 2.0}
  ],
  "feedback": "Perfect pace! Keep it up.",
  "metrics": {
    "amplitude_sustained": true,
    "duration_sec": 1.9,
    "voicedRatio": 0.88
  }
}
```

**Response (Fail):**
```json
{
  "pass": false,
  "wpm": 145,
  "feedback": "Slow down a bit—you're at 145 WPM!",
  "transcript": "I like to play games",
  "confidence": 0.82,
  "metrics": { ... }
}
```

---

### POST `/analyze/balloon`

Analyzes a balloon game audio clip for easy onset (smooth vocal start).

**Request:**
```json
{
  "audio_file": "<base64-encoded WAV>",
  "game_type": "balloon"
}
```

**Response (Pass — Soft Onset):**
```json
{
  "pass": true,
  "onset_slope_db_ms": 3.2,
  "fluency_category": "fluent",
  "confidence": 0.88,
  "feedback": "Wonderful soft start! Keep it smooth.",
  "metrics": {
    "amplitude_sustained": true,
    "duration_sec": 1.2,
    "noiseDetected": false
  }
}
```

**Response (Fail — Hard Onset):**
```json
{
  "pass": false,
  "onset_slope_db_ms": 12.5,
  "fluency_category": "blocking",
  "confidence": 0.76,
  "feedback": "Start softer! Breathe in gently.",
  "waveform_visual": {
    "time_points": [0, 10, 20, 30, ...],
    "amplitude_db": [-40, -35, -28, -20, ...]
  }
}
```

---

### POST `/analyze/tapping`

Analyzes a tapping game audio clip for syllable matching and fluency verification.

**Request:**
```json
{
  "audio": "<M4A or WAV file>",
  "targetWord": "butterfly",
  "syllables": ["But", "ter", "fly"],
  "taps": [0.2, 0.5, 0.8]
}
```

**Response (Pass — All Syllables Matched):**
```json
{
  "accuracy": 1.0,
  "fluent": true,
  "is_sync": true,
  "confidence": 0.89,
  "transcript": "butterfly",
  "feedback": "Perfect! You said every part clearly!",
  "syllable_matches": [true, true, true]
}
```

**Response (Partial — Some Syllables Matched):**
```json
{
  "accuracy": 0.67,
  "fluent": false,
  "is_sync": false,
  "confidence": 0.72,
  "transcript": "but fly",
  "feedback": "You got 2 out of 3 parts. Keep trying!",
  "syllable_matches": [true, false, true]
}
```

---

### GET `/warmup`

Warms up the WavLM model to avoid first-request latency.

**Request:**
```
GET /warmup
```

**Response:**
```json
{
  "status": "success",
  "message": "Model warmed up successfully",
  "inference_time_ms": 1250
}
```

**Usage:**
Call this once at server startup to pre-load the model:
```python
import requests
requests.get("http://localhost:5000/warmup")
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing field 'audio_file' in request",
  "code": "MISSING_FIELD"
}
```

### 413 Payload Too Large
```json
{
  "error": "Audio file exceeds 10MB limit",
  "code": "FILE_TOO_LARGE"
}
```

### 500 Internal Server Error
```json
{
  "error": "WavLM model inference failed",
  "code": "MODEL_ERROR",
  "details": "CUDA out of memory"
}
```

---

## Audio Encoding

### Supported Formats
- **WAV** (PCM, 16 kHz mono) — Preferred, fastest processing
- **M4A** (AAC, any sample rate) — Supported, resampled to 16 kHz

### Sample Rate Handling
```
Input: 44.1 kHz → Resampled to 16 kHz (slower, ~3–4s inference)
Input: 16 kHz → Processed directly (faster, ~0.5–2s inference)
Input: 8 kHz → Upsampled (may lose high-frequency information)
```

### Upload Example (Frontend)

```typescript
async function uploadAudioAnalysis(audioUri: string, gameType: "snake" | "turtle") {
  const formData = new FormData();
  
  // Read file and convert to base64
  const audioBlob = await fetch(audioUri).then(r => r.blob());
  const base64Audio = await blobToBase64(audioBlob);
  
  formData.append("audio_file", base64Audio);
  formData.append("game_type", gameType);
  formData.append("phoneme_target", "m");  // If snake
  
  const response = await fetch("http://localhost:5000/analyze/snake", {
    method: "POST",
    body: formData,
    timeout: 10000
  });
  
  return response.json();
}
```

---

## Rate Limiting & Timeouts

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Request Timeout** | 15s | Includes STT API latency |
| **Max Payload** | 10 MB | Limits to ~60s of audio |
| **Rate Limit** | None (dev) | Add in production |
| **Concurrent Requests** | Limited by GPU/CPU | ~10–20 per server |

---

## See Also

- **[WavLM Model Details](WAVLM_MODEL.md)** — Model architecture, optimization
- **[System Architecture](../ARCHITECTURE.md)** — Deployment overview and production considerations
- **[Backend Architecture](../ARCHITECTURE.md#backend-endpoints)** — System overview
