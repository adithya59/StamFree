# 🐍 Snake Game — Prolongation Training

## Objective
Teach children to **sustain phoneme sounds smoothly** without rushing or tensing. Prolongation is a clinical technique where the speaker intentionally stretches vowel sounds and fricatives (like "Mmmmm" or "Ssssss"), which reduces pressure and promotes natural fluency.

---

## How It Works

### Gameplay Flow
```
1. Child sees a phoneme on screen (e.g., "m")
2. Child presses record button → starts speaking "Mmmmm..."
3. Snake moves along path as long as speech is detected
4. Game checks: Did child sustain sound for 2–3 seconds?
5. If YES → PASS (phoneme complete, earn XP)
   If NO → Retry message shown
```

### Visual Feedback
- **During Recording**: Waveform animates in real-time, snake moves
- **On Success**: Snake reaches end of path, celebration animation
- **On Failure**: Snake stops mid-path, encouraging "Try again" message

---

## ML Integration: How WavLM Detects Success

### Input to Backend
```json
{
  "audio_file": "<3-second WAV recording>",
  "phoneme_target": "m",
  "game_type": "snake"
}
```

### Backend Processing (`POST /analyze/snake`)
```python
1. Load 3-second user audio (16kHz PCM)
2. Extract WavLM 768-dim embeddings
3. Pass through classification head
4. Get probabilities:
   {
     "fluent": 0.92,         # Clean, sustained phoneme
     "repetition": 0.04,     # Not applicable (single sound)
     "blocking": 0.02,       # Struggled to start
     "prolongation": 0.02    # Intentional (expected!)
   }
5. Check duration: Valid if > 1.8s continuous voicing
6. Check pitch stability: Variation < 15 semitones (smooth sustain)
7. Amplitude consistency: RMS variation < 3dB (steady volume)
```

### Pass Criteria
- `fluency_category == "fluent"` AND
- `confidence > 0.75` AND
- `duration_ms > 1800` (at least 1.8 seconds) AND
- `pitch_variation < 15` semitones AND
- `amplitude_variation < 3` dB

### Clinical Rationale
- **Duration**: Ensures adequate sound prolongation practice
- **Pitch/Amplitude Stability**: Prevents harsh tension (acoustic markers of struggle)
- **Confidence Threshold (0.75)**: Allows some model uncertainty

### Failure Modes & Feedback
```
IF duration < 1800ms:
  Feedback: "Hold it a bit longer! Try again."
  Reason: Not enough practice time

IF confidence < 0.65 AND amplitude_variation > 5dB:
  Feedback: "Keep the volume steady—you've got this!"
  Reason: Acoustic markers of tension detected

IF fluency_category == "blocking":
  Feedback: "Easy onset! Start gently. Try again."
  Reason: Hard glottal attack detected at beginning
```

---

## Game State Machine

```
┌─────────────┐
│   IDLE      │
│ (Ready)     │
└──────┬──────┘
       │ Child presses record
       ↓
┌──────────────┐
│  RECORDING   │
│ (Listening)  │
└──────┬───────┘
       │ Child releases or timeout (3s)
       ↓
┌──────────────────┐
│ UPLOADING AUDIO  │
│ (Processing)     │
└──────┬───────────┘
       │ Backend responds
       ↓
    ┌─DECISION─┐
    │           │
    ├─→ PASSED → SHOW SUCCESS → Award XP → Update playlist
    │
    └─→ FAILED → SHOW FEEDBACK → Offer retry
```

---

## Playlist Progression & Phoneme Tiers

### Active Set Management (Sliding Window)

**Current Active Phonemes**: 5 sounds at any time (user cycles through)

```
After each attempt:
{
  "m": {
    "success_rate": 0.78,
    "attempts": 15,
    "last_attempted": "2024-04-20T14:32:00Z"
  },
  "s": {
    "success_rate": 0.92,
    "attempts": 12,
    "last_attempted": "2024-04-20T14:28:00Z"
  },
  "n": {
    "success_rate": 0.45,
    "attempts": 5,
    "last_attempted": "2024-04-20T14:12:00Z"
  },
  ...
}

Graduation Criteria (Mastery):
IF success_rate >= 0.75 AND attempts >= 5:
  Phoneme → Graduates out (marked "mastered")
  New phoneme from pool → Added to active set

Result: Continuous cycling of 5 active sounds
```

### Content Pool Phoneme Tiers

The `snake_phoneme_pool` Firestore collection contains 16 phonemes organized by difficulty.

#### Tier 1: Low Stress ("Flow" Sounds)
Focus on continuous, low-tension phonemes:
- **Vowels**: /a/, /e/, /i/, /o/, /u/
- **Nasals**: /m/, /n/ (continuous airflow through nose)
- **Liquids**: /l/, /r/ (smooth, continuous formants)
- **Glides**: /w/, /y/ (smooth transitions)

**Why first**: Easy to sustain without tension; confidence-building for young learners.

#### Tier 2: Medium Stress ("Friction" Sounds)
Fricatives and sibilants requiring sustained airflow against constriction:
- **Fricatives**: /f/, /v/, /th/, /h/
- **Sibilants**: /s/, /z/, /sh/

**Why second**: Requires more oral motor control; stuttering patterns (repetitions, blocks) more likely to appear here.

#### Tier 3: High Stress ("Stop" Sounds / Plosives)
Sounds requiring precise airflow control for release:
- **Stops/Plosives**: /p/, /b/, /t/, /d/, /k/, /g/

**Why last**: Most difficult; highest risk for blocked airflow or articulatory tension; requires most advanced motor control.

---

## File Structure

```
app/exercises/
├── snake-game.tsx                # Main game screen
├── components/snake/
│   ├── SnakeEngine.tsx           # Game rendering + path logic
│   ├── PhonemeSelector.tsx       # Show current active phonemes
│   └── FeedbackOverlay.tsx       # Pass/fail messages
├── hooks/
│   └── useSnakeSession.ts        # Game state machine + backend calls
└── services/
    ├── snakeAnalysis.ts          # Upload audio, call /analyze/snake
    ├── snakePlaylist.ts          # Manage active set progression
    ├── snakeProgression.ts       # Mastery evaluation logic
    └── snakeGameLogic.ts         # Snake path, collision detection
```

---

## Type Definitions (`types/snake.ts`)

```typescript
interface PhonemeData {
  id: string;                    // "m", "s", "z"
  phoneme_ipa: string;           // IPA symbol
  phoneme_text: string;          // "m sound"
  tier: "Flow" | "Friction";
  example_words: string[];       // ["mama", "moon", "sum"]
}

interface SnakeMetrics {
  fluency_category: "fluent" | "repetition" | "blocking" | "prolongation";
  confidence: number;            // 0.0-1.0
  duration_ms: number;
  pitch_variation: number;       // semitones
  amplitude_variation: number;   // dB
  pass: boolean;
}

interface SnakeSessionState {
  active_phonemes: PhonemeData[];
  current_phoneme_index: number;
  is_recording: boolean;
  snake_position: number;        // 0-100 (%)
  game_status: "idle" | "recording" | "processing" | "result";
}
```

---

## See Also
- [Games Overview](INDEX.md)
- [Backend API — /analyze/snake](../BACKEND/FLASK_API.md#analyze-snake)
- [WavLM Model](../ML/TRAINING_VALIDATION.md)
