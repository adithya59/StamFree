# StamFree Games Overview

StamFree features four evidence-based speech therapy games, each targeting a specific aspect of stuttering management. All games follow the same **Playlist Progression** pattern (sliding window of 3-5 active items) and communicate with the backend WavLM AI model for fluency classification.

## Game Selection Guide

### 🐍 [Snake Game — Prolongation Training](SNAKE.md)
Teach children to **sustain phoneme sounds smoothly** without rushing or tensing.
- **Target**: Vowels, nasals, liquids first; fricatives and stops later
- **Progression**: Tier 1 (Flow) → Tier 2 (Friction) → Tier 3 (Stops)
- **AI Analysis**: WavLM detects sustained voicing + pitch/amplitude stability
- **Clinical Goal**: Reduce tension, build fluent prolongation
- **Best for**: Kids who rush or tense up on sounds

---

### 🐢 [Turtle Game — Rate Control](TURTLE.md)
Train children to **speak at an appropriate, controlled pace** (80–120 WPM).
- **Three Levels**: Forest (40–70 WPM) → River (70–100 WPM) → Hill (100–120 WPM)
- **AI Analysis**: Google Speech-to-Text + WavLM for fluency classification
- **Content**: Simple sentences → complex narratives
- **Clinical Goal**: Slow down rushed speech; build conversational fluency
- **Best for**: Kids who speak too fast or show rate variability

---

### 🎈 [Balloon Game — Easy Onset](BALLOON.md)
Train **soft, gentle vocal onsets** to reduce hard glottal attacks (stuttering blocks).
- **Mechanics**: Measures amplitude rise time at word start
- **Pass Criteria**: Soft onset (< 5 dB/ms) triggers balloon inflation
- **AI Analysis**: DSP onset slope detection + WavLM fluency check
- **Content**: Words with vowel/easy onsets first
- **Clinical Goal**: Eliminate hard glottal attacks; smooth word entry
- **Best for**: Kids with blocking or tense onsets

---

### 🎯 [Tapping Game — Impulse Control](TAPPING.md)
Reduce **repetitions** (syllable/word loops) by practicing multi-syllable words without stuttering interruptions.
- **Mechanics**: Detects syllable repetitions in multi-syllable words
- **Content**: 2-syllable → 5+ syllable words
- **AI Analysis**: WavLM repetition classification + Google STT
- **Clinical Goal**: Build confidence in fluent multi-syllable production
- **Best for**: Kids with repetitive stuttering patterns

---

## Shared Architecture Across All Games

### Playlist Progression ("Sliding Window")
All games use a **3–5 active item set** that cycles through content:

```
User speaks → Backend analyzes → Pass/Fail decision
   ↓
Pass (75%+ success rate over 5+ attempts):
   → Item "graduates" to mastered collection
   → New item from content pool joins active set
   → User continues with fresh challenge

Result: Continuous practice variation without boredom
```

**Firestore Collections Involved**:
- User progress: `users/{uid}/{game}_progress/playlist`
- Content pools: `snake_phoneme_pool`, `turtle_content_pool`, `tapping_content_pool`
- Activity logs: `users/{uid}/activity_logs/{attemptId}` (audit trail)

---

### Audio Recording Standard (All Games)
**Sample Rate**: 16 kHz mono (PCM WAV on iOS, AAC M4A on Android)
**Duration**: 3–5 seconds per attempt
**Upload**: via `services/audioService.ts` → Flask backend

---

### Backend Analysis Flow
```
Frontend records audio
   ↓
POST /analyze/{game_type}  (Flask endpoint)
   ↓
WavLM Feature Extraction (768-dim embeddings)
   ↓
Multi-class Classification (fluent | repetition | blocking | prolongation)
   ↓
Game-Specific Validation:
   - Snake: duration + pitch/amplitude stability
   - Turtle: WPM calculation from Google STT
   - Balloon: onset slope (DSP)
   - Tapping: repetition count
   ↓
Response: { pass: boolean, metrics: {...}, feedback: string }
```

---

### Statistics & Progress Tracking
After every successful attempt:
```typescript
import { updateUserStatsOnActivity } from '@/services/statsService';
await updateUserStatsOnActivity(xpAmount);
```

This updates:
- **Total XP** (game-agnostic)
- **Weekly session count** (resets Monday)
- **Current streak** (consecutive days with activity)
- **Game-specific stats** (per-phoneme or per-sentence success rates)

---

### Firestore Collections Summary

| Collection | Purpose | Structure |
|-----------|---------|-----------|
| `snake_phoneme_pool` | Read-only content pool (16 phonemes) | `{id, phoneme, ipa, tier, example, category}` |
| `turtle_content_pool` | Read-only content pool (120 sentences) | `{id, text, tier, wordCount, category}` |
| `tapping_content_pool` | Read-only content pool (24 words/sentences) | `{id, text, syllables, tier, category}` |
| `users/{uid}/stats/summary` | Global XP + streaks | `{totalXP, currentStreak, sessionsThisWeek}` |
| `users/{uid}/{game}_progress/playlist` | Active items + mastery tracking | `{activePhonemes, masteredPhonemes, phonemeStats}` |
| `users/{uid}/activity_logs/{id}` | Audit trail (immutable) | `{exerciseType, pass, metrics, feedback, createdAt}` |
| `users/{uid}/practice_sessions/{id}` | High-level game history | `{gameId, timestamp, [game-specific]}` |

---

## For Developers: File Structure

```
app/exercises/
├── snake-game.tsx
├── turtle-game.tsx
├── balloon-game.tsx
├── tapping-game.tsx
│
components/
├── snake/
│   ├── SnakeEngine.tsx
│   └── FeedbackOverlay.tsx
├── turtle/
│   ├── TurtleEngine.tsx
│   └── WPMIndicator.tsx
├── balloon/
│   ├── BalloonAnimation.tsx
│   └── OnsetVisualizer.tsx
│
hooks/
├── useSnakeSession.ts
├── useTurtleSession.ts
├── useBalloonSession.ts
├── useTappingSession.ts
│
services/
├── snakeAnalysis.ts, snakePlaylist.ts, snakeProgression.ts
├── turtleAnalysis.ts, turtlePlaylist.ts
├── balloonProgression.ts
├── audioService.ts (shared audio recording)
├── statsService.ts (shared XP + progress)
├── clinicalLogic.ts (shared DSP utilities)
│
types/
├── snake.ts
├── turtle.ts
└── shared.ts
```

---

## Next: Learn a Specific Game

- **[🐍 Snake Game Documentation](SNAKE.md)** — Detailed mechanics, WavLM analysis, state machine
- **[🐢 Turtle Game Documentation](TURTLE.md)** — Rate control mechanics, WPM calculation, tier progression
- **[🎈 Balloon Game Documentation](BALLOON.md)** — Onset detection, DSP analysis, visual feedback
- **[🎯 Tapping Game Documentation](TAPPING.md)** — Repetition detection, multi-syllable training

---

**See Also:**
- [Backend API Reference](../BACKEND/FLASK_API.md)
- [WavLM Model Details](../ML/TRAINING_VALIDATION.md)
- [System Architecture](../ARCHITECTURE.md)
