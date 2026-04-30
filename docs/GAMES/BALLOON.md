# 🎈 Balloon Game — Easy Onset

## Objective
Train **soft, gentle vocal onsets** to reduce hard glottal attacks (stuttering blocks often involve tensioned throat onset). Children practice starting words smoothly without abrupt, harsh pressure.

---

## How It Works

### Gameplay Flow
```
1. Child sees a word (e.g., "apple")
2. Child presses record → speaks the word naturally
3. Game analyzes: How fast did the amplitude rise at word start?
4. Soft onset = slow amplitude rise = smooth start (GOOD!)
   Hard onset = fast amplitude rise = tense start (BAD!)
5. If amplitude rise < 5 dB/ms → PASS
   Else → Retry with feedback
```

### Visual Feedback
- **During Recording**: Real-time waveform showing onset slope
- **On Success**: Balloon inflates smoothly and floats away
- **On Failure**: Balloon bursts (too harsh), retry message

---

## ML Integration: Onset Detection

### Input to Backend
```json
{
  "audio_file": "<3-second WAV recording>",
  "game_type": "balloon"
}
```

### Backend Processing (`POST /analyze/balloon`)
```python
1. Load 3-second user audio (16kHz PCM)
2. Detect speech onset:
   - Find first frame with energy > 40% of max (voice activity)
3. Extract onset slope:
   - Measure amplitude rise over first 100ms (speech onsets ~50-150ms)
   - Calculate: (peak_amplitude - onset_amplitude) / time_duration
   - Result: X dB/ms (decibels per millisecond)
4. Soft onset = low slope (< 5 dB/ms)
   Hard onset = high slope (> 8 dB/ms)
```

### WavLM Role (Secondary)
- Classify overall phoneme fluency (ensure word is recognizable)
- Fallback if simple DSP slope unreliable
- Confidence check

### Pass Criteria
- `onset_slope_db_ms < 5.0` (soft onset) AND
- `fluency_category != "blocking"` AND
- `confidence > 0.70`

### Failure Modes & Feedback
```
IF onset_slope_db_ms > 8.0:
  Feedback: "Start softer! Breathe in gently. Try again."
  DSP Indicator: Show waveform slope comparison
  
IF confidence < 0.70:
  Feedback: "I didn't quite catch that. Try again."
```

---

## Game State Machine

```
┌─────────────┐
│   IDLE      │
│ (Show word) │
└──────┬──────┘
       │ Child presses record
       ↓
┌──────────────┐
│  RECORDING   │
│ (Listen)     │
└──────┬───────┘
       │ Child releases or timeout
       ↓
┌──────────────────┐
│ DSP ANALYSIS     │
│ (Onset slope)    │
└──────┬───────────┘
       │ Local processing
       ↓
    ┌─DECISION─┐
    │           │
    ├─→ Soft → BALLOON FLOATS → Award XP → Next word
    │
    └─→ Hard → BALLOON BURSTS → Show slope graph → Retry
```

---

## Playlist Progression

### Active Set Management (Words)

```
Current Active Words: ["apple", "egg", "open"]

Each word tracks:
{
  "word": "apple",
  "phoneme_start": "æ",          // Vowel onset (easier than consonant)
  "difficulty": "easy",
  "success_rate": 0.72,
  "attempts": 18,
  "avg_onset_slope": 6.2        // dB/ms (user's avg)
}

Graduation:
IF success_rate >= 0.80 AND attempts >= 5:
  → Replace with new word from pool
```

### Content Pool
Words with varying onset difficulties:
- **Easy**: Words starting with vowels or nasals (a, e, i, o, u, n, m)
- **Medium**: Words with fricatives (s, f, sh)
- **Hard**: Stops and affricates (p, b, t, d, ch, g)

---

## File Structure

```
components/balloon/
├── BalloonGame.tsx               # Main game screen
├── BalloonAnimation.tsx          # Balloon inflate/burst animation
├── OnsetVisualizer.tsx           # Waveform slope graph
├── hooks/
│   └── useBalloonSession.ts      # Game state + DSP calls
└── services/
    ├── balloonProgression.ts     # Mastery tracking
    └── clinicalLogic.ts          # Shared DSP utilities
```

---

## Type Definitions

```typescript
interface BalloonMetrics {
  onset_slope_db_ms: number;     // Steepness of amplitude rise
  fluency_category: string;      // "fluent" or "blocking"
  confidence: number;
  pass: boolean;
  feedback: string;
  waveform_visual?: {            // For UI display
    time_points: number[];
    amplitude_db: number[];
  };
}
```

---

## See Also
- [Games Overview](INDEX.md)
- [Backend API — /analyze/balloon](../BACKEND/FLASK_API.md#analyze-balloon)
- [Shared DSP Utilities](../BACKEND/WAVLM_MODEL.md#dsp-operations)
