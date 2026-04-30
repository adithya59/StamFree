# 🎯 Tapping Game — Impulse Control

## Objective
Reduce **repetitions** (syllable/word loops) by practicing multi-syllable words without stuttering interruptions. Teaches rapid word production without hesitation.

---

## How It Works

### Gameplay Flow
```
1. Child sees a multi-syllable word (e.g., "butterfly")
2. Child presses record → speaks the word once (no repeats!)
3. Game detects: Did the child repeat any syllables?
4. If NO repetitions → PASS
   If YES → Shows number of reps, retry
```

### Visual Feedback
- **During Recording**: Counter tracks syllable transitions
- **On Success**: Tap/sparkle effect, XP awarded
- **On Failure**: Shows repetition points marked on waveform

---

## ML Integration: Repetition Detection

### Input to Backend
```json
{
  "audio_file": "<3-second WAV recording>",
  "word_target": "butterfly",
  "game_type": "tapping"
}
```

### Backend Processing (`POST /analyze/tapping`)
```python
1. Load audio + Get Google STT transcript
2. WavLM Classification:
   {
     "fluent": 0.75,
     "repetition": 0.18,  # Key metric!
     "blocking": 0.05,
     "prolongation": 0.02
   }
3. Syllable Matching:
   - Match transcript syllables against target word syllables
   - Return array of match booleans per syllable
4. Calculate accuracy = syllables_matched / total_syllables
```

### Pass Criteria
- `fluency_category != "repetition"` AND
- `repetition_count == 0` AND
- `confidence > 0.75`

### Failure Modes & Feedback
```
IF fluency_category == "repetition":
  Feedback: "You repeated a syllable. Try saying it smoothly: but-ter-fly"
  Visual: Highlight repeated syllables on waveform
  
IF repetition_count > 0:
  Feedback: "I heard a repeat. Take a breath and try once more!"
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
       │ Release (or timeout)
       ↓
┌──────────────────────┐
│ WAVLM + STT ANALYSIS │
│ (Repetition detect)  │
└──────┬───────────────┘
       │ Classification result
       ↓
    ┌─DECISION─┐
    │           │
    ├─→ No reps → TAP SPARKLE → Award XP → Next word
    │
    └─→ Has reps → SHOW REPS → Waveform visual → Retry
```

---

## Playlist Progression

### Active Set (Multi-syllable words)

```
Current Active Words: ["butterfly", "elephant", "motorcycle"]

{
  "word": "butterfly",
  "syllable_count": 3,
  "difficulty": "medium",
  "success_rate": 0.65,
  "attempts": 17,
  "common_reps": [{"syllables": [0, 1], "frequency": 3}]  // but-but
}

Graduation:
IF success_rate >= 0.80 AND attempts >= 5:
  → Add harder word (more syllables or rapid consonant clusters)
```

### Content Pool
- **Easy**: 2-syllable words (ap-ple, ba-na-na)
- **Medium**: 3-4 syllable words (but-ter-fly, el-e-phant)
- **Hard**: 5+ syllables or consonant clusters (mo-tor-cy-cle, an-i-mal)

---

## Firestore Content Loading

The Tapping game **dynamically loads all content from Firestore** (not hardcoded). On app startup:

```typescript
// app/exercises/tapping-game.tsx
useEffect(() => {
    const loadTappingContent = async () => {
        const querySnapshot = await getDocs(collection(db, 'tapping_content_pool'));
        const words = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: data.id,
                word: data.text,
                syllables: data.syllables,
                tier: data.tier,
                ttsSyllables: data.syllables
            };
        });
        setPracticeWords(words);
    };
    loadTappingContent();
}, []);
```

### Firestore Collection Schema: `tapping_content_pool`

Each document contains:

```json
{
  "id": "string (unique identifier)",
  "text": "string (display text, e.g., 'Butterfly')",
  "syllables": ["array of strings (e.g., ['But', 'ter', 'fly'])"],
  "tier": "number (1 | 2 | 3)",
  "category": "string (animals | food | objects | places | actions | sentences)"
}
```

### Collection Structure

| Tier | Count | Content Type | Example |
|------|-------|--------------|---------|
| 1    | 4     | Simple words (2-3 syllables) | "Monkey", "Apple" |
| 2    | 8     | Short sentences (3-5 syllables) | "I like it", "See the dog" |
| 3    | 12    | Complex sentences (5-7 syllables) | "The sun is shining", "Birds fly in the sky" |

**Total**: 24 items automatically seeded via `npx ts-node scripts/seed-all-content.ts`

---

## File Structure

```
app/exercises/
├── tapping-game.tsx              # Main game screen (loads from Firestore)
└── hooks/
    └── useTappingSession.ts      # Game state + repetition detection
    
scripts/
└── seed-all-content.ts           # Seeds all 4 game content pools
```

---

## See Also
- [Games Overview](INDEX.md)
- [Backend API — /analyze/tapping](../BACKEND/FLASK_API.md#analyze-tapping)
- [WavLM Classification](../ML/TRAINING_VALIDATION.md#multi-class-classification)
- [Seed Script Documentation](../../README.md#step-7-seed-firestore-content)
