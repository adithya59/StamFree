# 🐢 Turtle Game — Rate Control

## Objective
Train children to **speak at an appropriate, controlled pace** (80–120 words per minute). Fast, rushed speech often triggers or worsens stuttering. The turtle metaphor encourages "slow and steady" progress through three difficulty levels with increasing target speech rates.

---

## Three Difficulty Levels

### Forest Level (Slowest)
- **Target WPM**: 40–70 words/minute
- **Clinical Goal**: Establish baseline rate control; build confidence without pressure
- **Content**: Simple, short sentences (2–4 words)
- **Progression**: Simple single-word targets → simple two-word phrases → short simple sentences

### River Level (Moderate)
- **Target WPM**: 70–100 words/minute  
- **Clinical Goal**: Transition to conversational pace while maintaining fluency
- **Content**: Compound sentences with moderate length (5–8 words)
- **Progression**: Compound sentences → sentences with conjunctions ("and", "but", "or")

### Hill Level (Normal Conversation)
- **Target WPM**: 100–120 words/minute
- **Clinical Goal**: Real-world conversational speed with full control
- **Content**: Complex sentences and short narratives (9+ words)
- **Progression**: Complex sentences → multi-sentence narratives → storytelling

---

## How It Works

### Gameplay Flow
```
1. Child sees a sentence at current level (e.g., Forest: "I like apples")
2. Child presses record → speaks the sentence at comfortable pace
3. Game calculates: Words Per Minute (WPM) from Google STT
4. Game checks: Is WPM within level's target range?
   - Forest: 40–70 WPM?
   - River: 70–100 WPM?
   - Hill: 100–120 WPM?
5. If YES → PASS (advance through content)
   If NO → Retry with feedback showing current WPM
```

### Visual Feedback
- **Target Zone Display**: Turtle animation shows target WPM range
- **User's Rate Indicator**: Real-time feedback showing actual WPM
- **On Success**: Turtle progresses forward, celebration animation
- **On Failure**: Turtle pauses, encouraging "Try again" with current WPM displayed

---

## ML Integration: WPM Calculation

### Input to Backend
```json
{
  "audio_file": "<3-second WAV recording>",
  "targetText": "I like to play games",
  "tier": 1,
  "game_type": "turtle"
}
```

### Backend Processing (`POST /analyze/turtle`)
```python
1. Load 3-second user audio
2. Call Google Cloud Speech-to-Text API
3. Receive response:
   {
     "transcript": "I like to play games",
     "words": [
       {"word": "I", "start_time": 0.0, "end_time": 0.2},
       {"word": "like", "start_time": 0.3, "end_time": 0.6},
       {"word": "to", "start_time": 0.8, "end_time": 1.0},
       {"word": "play", "start_time": 1.2, "end_time": 1.4},
       {"word": "games", "start_time": 1.6, "end_time": 1.9}
     ]
   }

4. Extract word times:
   word_count = 5
   total_duration = 1.9s
   
5. Calculate WPM:
   WPM = (word_count / total_duration) × 60
       = (5 / 1.9) × 60
       = 157.9 WPM (too fast for Forest level!)

6. Validate transcript match (strict for short sentences, lenient for long):
   IF len(target_words) <= 6:
     ALL content words must be present
   ELSE:
     Allow 1 mistake in long sentences
```

### Pass Criteria (Current Implementation)
- `WPM >= 40` AND `WPM <= 100` (global validation; tier-specific ranges not yet implemented)
- Transcription confidence > 0.85 (Google STT)
- Content words match target text (or no target provided)

⚠️ **Note**: Backend currently validates all levels against 40–100 WPM range. Tier-specific thresholds (Forest 40–70, River 70–100, Hill 100–120) should be implemented for proper difficulty scaling based on `tier` parameter.

### Failure Modes & Feedback
```
IF WPM < 40:
  Feedback: "Speak a bit faster! You're at 35 WPM, aim for the turtle's speed."
  
IF WPM > 100:
  Feedback: "Slow down a bit—you're at 145 WPM, help the turtle keep up!"
  
IF transcript_match == False AND target_text != "":
  Feedback: "Good speed! But try to say the exact words."
  
IF confidence < 0.85:
  Feedback: "I didn't catch all the words clearly. Try again."
```

---

## Game State Machine

```
┌─────────────┐
│   IDLE      │
│ (Show sent) │
└──────┬──────┘
       │ Child presses record
       ↓
┌──────────────────┐
│  RECORDING       │
│ (Listen to STT)  │
└──────┬───────────┘
       │ Child finishes or timeout (3s)
       ↓
┌──────────────────────┐
│ GOOGLE STT ANALYSIS  │
│ (Async API call)     │
└──────┬───────────────┘
       │ STT response received
       ↓
    ┌─DECISION─┐
    │           │
    ├─→ WPM OK → SHOW SUCCESS → Award XP → Next sentence
    │
    └─→ WPM OFF → SHOW CURRENT WPM → Offer retry
```

---

## Playlist Progression

### Active Set Management (Sentences)

```
Current Active Sentences:
[
  {
    "text": "I like to play games",
    "difficulty": "beginner",
    "word_count": 5,
    "success_rate": 0.68,
    "attempts": 15
  },
  {
    "text": "The quick brown fox jumps over the lazy dog",
    "difficulty": "intermediate",
    "word_count": 9,
    "success_rate": 0.85,
    "attempts": 12
  },
  {
    "text": "She sells seashells by the sea shore",
    "difficulty": "intermediate",
    "word_count": 7,
    "success_rate": 0.42,
    "attempts": 5
  }
]

Graduation Criteria:
IF success_rate >= 0.80 AND attempts >= 5:
  → Graduate to next difficulty tier
```

### Content Pool (`turtle_content_pool` Firestore)
- **Tier 1**: 40 sentences, 3–5 words (Forest — easiest)
- **Tier 2**: 40 sentences, 6–9 words (River — moderate)
- **Tier 3**: 40 sentences, 10–14 words (Hill — advanced)

---

## File Structure

```
app/exercises/
├── turtle-game.tsx               # Main game screen
├── components/turtle/
│   ├── TurtleEngine.tsx          # Turtle animation + rate bar
│   ├── SentenceDisplay.tsx       # Show current sentence
│   └── WPMIndicator.tsx          # Real-time WPM display
├── hooks/
│   └── useTurtleSession.ts       # Game state + STT handling
└── services/
    ├── turtleAnalysis.ts         # Upload audio, call /analyze/turtle
    ├── turtlePlaylist.ts         # Manage active sentences
    ├── turtleLogic.ts            # WPM calculations
    └── clinicalLogic.ts          # Shared normalization for Turtle
```

---

## Type Definitions (`types/turtle.ts`)

```typescript
interface TurtleContent {
  id: string;
  text: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  word_count: number;
  phoneme_focus?: string[];     // "s", "r", etc.
  example_sentences?: string[];
}

interface TurtleMetrics {
  wpm: number;
  transcript: string;
  words: Array<{
    word: string;
    start_time: number;
    end_time: number;
  }>;
  confidence: number;          // Google STT confidence
  pass: boolean;
  feedback: string;
}

interface TurtleSessionState {
  active_sentences: TurtleContent[];
  current_sentence_index: number;
  is_recording: boolean;
  current_wpm: number;          // Real-time or from last attempt
  game_status: "idle" | "recording" | "processing" | "result";
}
```

---

## See Also
- [Games Overview](INDEX.md)
- [Backend API — /analyze/turtle](../BACKEND/FLASK_API.md#analyze-turtle)
- [WavLM Model](../ML/TRAINING_VALIDATION.md)
