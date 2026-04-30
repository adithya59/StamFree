# StamFree System Architecture

## 1. Overview

StamFree is a **three-tier gamified speech therapy platform** designed for children with stuttering. It combines a React Native mobile frontend, a Python Flask backend with AI-powered speech analysis, and Firebase for real-time user authentication and progress tracking.

**Dataset**: Trained on ~26,000 rigorously annotated speech clips (SEP-28k podcast dataset: ~22k clips with 3-4 annotator consensus; Fluency Bank clinical dataset: ~4k clips) with data augmentation (pitch modification) and weighted loss to address class imbalance.

```
┌─────────────────────────────────────────────────────────────┐
│          React Native (Expo) Mobile App                     │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │   Games      │   Audio      │   Firebase   │            │
│  │  (UI State)  │   Capture    │  Integration │            │
│  └──────────────┴──────────────┴──────────────┘            │
└──────────────┬──────────────────────────────────────────────┘
               │ FormData Upload (PCM Audio)
               ↓
┌──────────────────────────────────────────────────────────────┐
│         Python Flask Backend (AI Analysis Server)           │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │   WavLM      │   Google     │    DSP       │            │
│  │   Base+      │   STT API    │  Processing  │            │
│  └──────────────┴──────────────┴──────────────┘            │
└──────────────┬──────────────────────────────────────────────┘
               │ JSON (Metrics & Classification)
               ↓
┌──────────────────────────────────────────────────────────────┐
│   Firebase (Auth + Firestore Real-time Database)            │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │  User Auth   │  Progress    │   Content    │            │
│  │  (JWT)       │  Tracking    │   Pools      │            │
│  └──────────────┴──────────────┴──────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

## 2. Critical Data Flow: Game Session Pipeline

Every game session follows this standardized pipeline:

### Step 1: User Speaks → Audio Capture
- **Service**: `services/audioService.ts`
- **Recording Format**:
  - **iOS**: `.wav` (Linear PCM, 16-bit, 16kHz)
  - **Android**: `.m4a` (AAC codec, 16kHz)
- **Sample Rate**: 16,000 Hz (matches WavLM model input requirements)
- **Duration**: Typically 3–5 seconds per exercise attempt

**Code Path**: `useSnakeSession.ts` → `audioService.recordAudio()` → Stored in temp cache

### Step 2: Audio Upload → Backend Analysis
- **Method**: `multipart/form-data` with binary audio blob
- **Endpoint**: `POST /analyze/{game-type}` (e.g., `/analyze/snake`)
- **Configuration**: Uses `EXPO_PUBLIC_BACKEND_URL` environment variable
- **Timeout**: 
  - Snake/Balloon: 10 seconds
  - Turtle: 15 seconds (slower due to Google STT)
- **Helper**: `services/audio.ts` → `uploadAudioWithTimeout()`

**Code Path**: `snakeAnalysis.ts` → `createFormData()` → `fetch(getAnalyzeUrl())`

### Step 3: Backend Processing → WavLM + Google STT
The Flask backend processes the audio through multiple analysis stages:

#### 3a. Audio Format Normalization
```
Raw Audio (WAV/M4A) 
  → Decode using librosa/pydub
  → Resample to 16kHz (if needed)
  → Convert to PCM float32 array
```

#### 3b. Speech Detection (DSP Layer)
- **Amplitude Analysis**: Detect silence vs. speech using RMS energy thresholds
- **Pitch Detection**: Voicing detection using zero-crossing rate + spectral analysis
- **Formants**: Quick formant estimation to rule out noise/artifacts

**Confidence Thresholds**:
- `SPEECH_PROB_MIN = 0.35`: Minimum speech probability for valid segment
- `PITCHED_RATIO_MIN = 0.15`: Minimum voiced pitch ratio for phoneme detection

#### 3c. WavLM Base+ Feature Extraction
**Why WavLM instead of Wav2Vec 2.0 or CNNs?**

| Aspect | WavLM Base+ | Wav2Vec 2.0 | CNN |
|--------|-----------|-----------|-----|
| **Architecture** | Gated temporal conv + Transformer self-attention | Simple temporal conv + Transformer | Fixed receptive field |
| **Long-range Dependencies** | ✓ Excellent (masked prediction task) | ✓ Good | ✗ Limited |
| **Noise Robustness** | ✓ Pre-trained on denoising + prediction | ✓ Pre-trained on masked prediction | ✗ Brittle with background noise |
| **Classroom/Home Audio** | ✓ Handles overlapping speech, reverb | ~ Handles basic noise | ✗ Struggles with real-world audio |
| **Masked Speech Denoising** | ✓ Yes (proprietary pre-training) | ✗ No | ✗ No |

**WavLM Processing**:
```
3-second PCM audio (16kHz)
  → Extract 40-dim Mel filterbank features
  → Apply masked prediction pre-training task
  → Generate 768-dim contextualized embeddings
  → Average-pool across time → 768-dim sentence embedding
```

#### 3d. Multi-Class Classification
The model outputs probability distributions for four fluency categories:

```python
{
  "fluent": 0.85,           # Normal speech (clean onset, steady pace)
  "repetition": 0.08,       # Syllable/word repetition detected
  "blocking": 0.05,         # Audible or silent struggle
  "prolongation": 0.02      # Stretched/prolonged sound
}
```

**Decision Logic**:
- `argmax(probs)` determines primary category
- Secondary confidences used to override false positives
- Clinical override: If amplitude + pitch both abnormal, block classification confidence

#### 3e. Google Cloud Speech-to-Text (For Rate-based Games)
For the **Turtle Game** (rate control), the backend calls Google STT:
```
3-second audio segment
  → Google Cloud Speech API
  → Returns transcript + word timestamps
  → Calculate: WPM = (word_count / duration_seconds) × 60
```

**Result Example**:
```json
{
  "transcript": "I like to play games",
  "words": [
    {"word": "I", "start_time": 0.0, "end_time": 0.2},
    {"word": "like", "start_time": 0.3, "end_time": 0.6},
    ...
  ],
  "wpm": 95.0
}
```

### Step 4: Backend Returns Classification + Metrics
**POST Response** (e.g., `/analyze/snake`):
```json
{
  "status": "success",
  "game_type": "snake",
  "metrics": {
    "fluency_category": "fluent",
    "confidence": 0.87,
    "duration_ms": 2834,
    "pitch_variation": 12.3,
    "amplitude_avg_db": -15.2
  },
  "pass": true,
  "feedback": "Great! You held that sound smooth and steady."
}
```

### Step 5: Frontend Evaluates → Game State Update
**Code Path**: `snakeAnalysis.ts` → `evaluateResult()` → `updateGameState()`

**Decision Tree**:
```
IF metrics.confidence > 0.75 AND metrics.fluency_category matches exercise_target
  THEN: Exercise PASSED
    → Award XP
    → Update streak
    → Progress to next level/phoneme
ELSE IF metrics.confidence > 0.50
  THEN: Exercise PARTIAL (retry encouraged)
ELSE
  THEN: Exercise FAILED
    → Show corrective feedback
    → Allow immediate retry
```

### Step 6: Firestore Progress Sync
After successful pass:
```typescript
await updateUserStatsOnActivity({
  xp_awarded: 25,
  game_completed: "snake",
  phoneme_completed: "m",
  streak: streak + 1,
  session_timestamp: Date.now()
});
```

**Firestore Collections Updated**:
- `users/{uid}/stats` — XP, level, weekly streaks
- `users/{uid}/sessions/{game}/attempts` — Per-attempt records
- `users/{uid}/progress/phonemes` — Phoneme mastery stats

---

## 3. Game Architecture: Playlist-Based Progression

All four games use a **Sliding Window Playlist System** instead of discrete levels:

### 3.1 Snake Game (Prolongation Training)
**Active Set**: 3 phonemes (e.g., "m", "s", "z")
- **Mastery Threshold**: 80% success over 5+ attempts
- **Graduation**: Item leaves active set, new item added from `snake_phoneme_pool`
- **Content Pool**: Firestore `snake_phoneme_pool` collection (Tier 1=Flow, Tier 2=Friction)

**Example State**:
```json
{
  "active_phonemes": [
    {"id": "m", "success_rate": 0.72, "attempts": 18},
    {"id": "s", "success_rate": 0.88, "attempts": 12},
    {"id": "z", "success_rate": 0.45, "attempts": 5}
  ],
  "next_phoneme_from_pool": "sh"
}
```

### 3.2 Turtle Game (Rate Control)
**Active Set**: 3 sentences at target WPM (80–120 words/minute)
- **Mastery**: Similar 80% threshold
- **Content Pool**: `turtle_content_pool` (Tiers 1–3 by sentence complexity)
- **Backend**: `POST /analyze/turtle` calculates WPM from Google STT timestamps

### 3.3 Balloon Game (Easy Onset)
**Active Set**: 3 words focused on soft vocal onsets
- **Metric**: Amplitude rise time (onset slope)
- **Pass Criterion**: Slope < 5 dB/ms (gentle onset)
- **Backend**: `POST /analyze/balloon` analyzes waveform envelope

### 3.4 Tapping Game (Impulse Control)
**Logic**: Detect syllable matching in multi-syllable words
- **Backend**: `POST /analyze/tapping` matches spoken syllables against target word
- **Pass**: All syllables correctly matched with high confidence

---

## 4. Backend Endpoints

### 4.1 Analysis Endpoints

#### POST `/analyze/snake`
```
Input: FormData { audio_file: WAV/M4A, phoneme_target: string }
Output: { 
  pass: boolean, 
  metrics: { fluency_category, confidence, duration_ms, pitch_variation },
  feedback: string 
}
```

#### POST `/analyze/turtle`
```
Input: FormData { audio_file: WAV/M4A }
Output: { 
  pass: boolean,
  wpm: number,
  transcript: string,
  feedback: string 
}
```

#### POST `/analyze/balloon`
```
Input: FormData { audio_file: WAV/M4A }
Output: {
  pass: boolean,
  onset_slope_db_ms: number,
  feedback: string
}
```

#### POST `/analyze/tapping`
```
Input: FormData { audio_file: WAV/M4A, targetWord: string, syllables: array, taps: array }
Output: {
  accuracy: number,
  transcript: string,
  feedback: string,
  is_sync: boolean,
  fluent: boolean,
  syllable_matches: array
}
```

#### GET `/warmup`
- Loads WavLM model into memory (takes 7–8 seconds)
- Call on app startup to avoid user-facing latency

### 4.2 Health Endpoints
- `GET /health` — Server status
- `GET /config` — Current thresholds and model info

---

## 5. Frontend Architecture (React Native + Expo)

### 5.1 Screen Hierarchy
```
app/_layout.tsx (Stack Navigator + Reanimated setup)
├── app/(auth)/
│   ├── login.tsx
│   ├── signup.tsx
│   ├── password-reset.tsx
│   └── email-verification.tsx
├── app/(tabs)/
│   ├── index.tsx (Dashboard)
│   ├── profile.tsx (User Profile)
│   └── progress.tsx (Stats & Streaks)
└── app/exercises/
    ├── snake-game.tsx
    ├── turtle-game.tsx
    ├── balloon-game.tsx
    └── tapping-game.tsx
```

### 5.2 Game Session Hooks
- `useSnakeSession()` — State machine for Snake Game
- `useTurtleSession()` — State machine for Turtle Game
- `useBalloonSession()` — State machine for Balloon Game
- `useTappingSession()` — State machine for Tapping Game

Each hook manages:
- Audio recording start/stop
- Backend upload + timeout handling
- Pass/fail evaluation
- Streak/XP updates via `statsService`

### 5.3 Type Safety (TypeScript)
All game metrics defined in `types/` folder:
- `types/snake.ts` — PhonemeData, SnakeMetrics
- `types/turtle.ts` — TurtleContent, TurtleMetrics
- `types/shared.ts` — UnifiedResult, ExerciseAttemptPayload, UserStats

---

## 6. Firestore Schema & Data Persistence

### 6.1 Complete Database Structure (Verified from Codebase)

```
firestore/
├── users/{uid}/ (Document namespace)
│   ├── profile/ (Document) — User metadata
│   │   ├── display_name: string
│   │   ├── email: string
│   │   ├── age: number
│   │   └── created_at: timestamp
│   │
│   ├── stats/ (Collection)
│   │   └── summary (Document) — Global user stats
│   │       ├── totalXP: number
│   │       ├── currentStreak: number (days)
│   │       ├── lastActivityDate: string | null (ISO date)
│   │       ├── sessionsThisWeek: number
│   │       └── weekStartDate: string (ISO date of Monday)
│   │
│   ├── activity_logs/ (Collection) — Per-attempt results
│   │   └── {attemptId} (Document, ID = timestamp)
│   │       ├── exerciseType: "snake" | "turtle" | "balloon" | "tapping"
│   │       ├── gamePass: boolean
│   │       ├── clinicalPass: boolean
│   │       ├── confidence: number (0.0–1.0)
│   │       ├── feedback: string
│   │       ├── metrics: { [key]: number | boolean }
│   │       └── createdAt: string (ISO timestamp)
│   │
│   ├── practice_sessions/ (Collection) — Game session history
│   │   └── {sessionId} (Document, auto-generated ID)
│   │       ├── gameId: "snake" | "turtle" | "balloon" | "tapping"
│   │       ├── timestamp: timestamp (server-side)
│   │       ├── [game-specific data]
│   │       └── ...
│   │
│   ├── snake_progress/ (Collection)
│   │   └── playlist (Document) — Active phoneme set + mastery
│   │       ├── userId: string
│   │       ├── activePhonemes: string[] (5 phoneme IDs)
│   │       ├── masteredPhonemes: string[]
│   │       ├── lockedPhonemes: string[] (remaining from pool)
│   │       └── phonemeStats: {
│   │           [phonemeId]: {
│   │             attempts: number,
│   │             successCount: number,
│   │             lastPlayed: string (ISO timestamp)
│   │           }
│   │         }
│   │
│   ├── turtle_progress/ (Collection) — Active sentence set + XP + tier unlocks
│   │   └── playlist (Document)
│   │       ├── userId: string
│   │       ├── activeItems: string[] (12 item IDs per session)
│   │       ├── masteredItems: string[]
│   │       ├── lockedItems: string[] (remaining from pool)
│   │       ├── xp: number
│   │       ├── tier1Unlocked: boolean (always true)
│   │       ├── tier2Unlocked: boolean (unlock at 500 XP)
│   │       ├── tier3Unlocked: boolean (unlock at 1500 XP)
│   │       ├── currentSessionIds?: string[]
│   │       ├── lastLap?: number
│   │       ├── lastIndex?: number
│   │       └── itemStats: {
│   │           [itemId]: {
│   │             attempts: number,
│   │             successCount: number,
│   │             lastPlayed: string (ISO timestamp)
│   │           }
│   │         }
│   │
│   ├── tapping_progress/ (Collection) — Active multi-syllable words + mastery tracking
│   │   └── playlist (Document)
│   │       ├── userId: string
│   │       ├── activeWords: string[] (3 word IDs in active rotation)
│   │       ├── masteredWords: string[]
│   │       ├── lockedWords: string[] (remaining from pool)
│   │       └── wordStats: {
│   │           [wordId]: {
│   │             attempts: number,
│   │             successCount: number,
│   │             lastPlayed: string (ISO timestamp)
│   │           }
│   │         }
│   │
│   └── games/ (Collection) — Per-game progress
│       └── tapping (Document) — Tapping game progress
│           └── currentIndex: number (tracks current word in progression)
│
├── snake_phoneme_pool/ (Collection) — Shared phoneme inventory (read-only)
│   └── {phonemeId} (Document, e.g., "m", "s", "p")
│       ├── id: string
│       ├── phoneme: string (friendly name)
│       ├── ipa: string (IPA symbol)
│       ├── tier: 1 | 2 | 3 (Tier 1=Flow, Tier 2=Friction, Tier 3=Stop)
│       ├── example: string (e.g., "Mmmmm like mom")
│       └── category: string ("vowel" | "nasal" | "fricative" | "stop" | etc.)
│
├── turtle_content_pool/ (Collection) — Shared sentence inventory (read-only)
│   └── {itemId} (Document, auto-generated UUID)
│       ├── id: string
│       ├── text: string (target sentence)
│       ├── tier: 1 | 2 | 3 (Forest=1, River=2, Hill=3)
│       ├── wordCount: number
│       ├── complexity: "simple" | "compound" | "complex"
│       ├── targetWPM_min: number (40/70/100 by tier)
│       ├── targetWPM_max: number (70/100/120 by tier)
│       └── created_at: timestamp
│
├── tapping_content_pool/ (Collection) — Shared multi-syllable word inventory (read-only)
│   └── {itemId} (Document, e.g., "monkey", "butterfly")
│       ├── id: string
│       ├── text: string (display text, e.g., "Monkey", "Butterfly")
│       ├── syllables: string[] (e.g., ["Mon", "key"], ["But", "ter", "fly"])
│       ├── tier: 1 | 2 | 3 (1=2-3 syllables, 2=3-4 syllables, 3=5+ syllables)
│       └── category: string ("animals" | "food" | "objects" | "places" | "actions" | "sentences")
│
└── (No Schema) Balloon Game — Parent-guided breathing (no backend AI needed)
```

### 6.2 Storage Design Rationale

**Playlists as Single Documents (Not Collections):**
- Prevents write conflicts during concurrent progress updates
- Enables atomic playlist updates (add mastered, remove from active, add from locked)
- Example: Snake mastery check reads/updates entire playlist in one operation

**Activity Logs as Collection (Append-Only):**
- Designed for scalability and analytics
- No update conflicts (only ever append)
- Enables time-series querying (filter by date range)
- Document ID = timestamp ensures chronological ordering

**Nested Stats Objects (Not Sub-Collections):**
- `phonemeStats` is a map, not a sub-collection
- Atomic reads/writes (all phoneme stats fetched in one query)
- Avoids N+1 queries (would require separate query per phoneme if sub-collection)

**Content Pools at Root (Shared, Read-Only):**
- Indexed by `tier` for efficient queries (order by tier, limit)
- Same content shared across all users (reduces storage 1000x)
- Read-only for users (admin deploys new content via scripts)

### 6.3 Firestore Security Rules

```javascript
// Allow users to read/write only their own data
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  
  match /{document=**} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}

// Content pools: read-only for authenticated users
match /snake_phoneme_pool/{document=**} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only via CLI/backend
}

match /turtle_content_pool/{document=**} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only via CLI/backend
}
```

**Current Security Gap:** Backend endpoints have NO authentication validation (relies on CORS + URL obscurity). Production deployment requires:
1. API key validation on all `/analyze/*` endpoints
2. Request signing (HMAC-SHA256 of request body)
3. Rate limiting per user (IP-based or Firebase ID token)

### 6.4 Authentication Flow

- **Provider**: Firebase Auth (Email + Password)
- **Token Storage**: Secure storage (iOS Keychain, Android Keystore)
- **Routes**: Auth-gated screens in `app/(auth)/` group
- **Token Refresh**: Automatic via Firebase SDK on app startup

---

## 7. Deployment & Configuration

### 7.1 Environment Variables (.env)
```
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

# Backend
EXPO_PUBLIC_BACKEND_URL=http://localhost:5000  # Local dev
# OR
EXPO_PUBLIC_BACKEND_URL=https://stamfree-backend.run.app  # Cloud Run prod

# Google Cloud (Backend only)
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
MODEL_PATH=/path/to/wavlm_model
```

### 7.2 Development
```bash
npm install
npx expo start                    # Dev server (QR code + tunneling)
npm run android                   # Run on Android emulator

# Terminal 2: Backend
cd server
python app.py                     # Runs on http://localhost:5000
```

### 7.3 Production
- **Frontend**: Expo EAS Build → APK/IPA → App stores
- **Backend**: Docker container → Cloud Run / AWS ECS
- **Database**: Firebase Firestore (managed by Google)

---

## 8. Performance & Optimization

### 8.1 Audio Processing Optimization
- **PCM Format** (iOS .wav): Avoids transcoding overhead → ~200ms backend processing
- **Compressed Format** (Android .m4a): Requires librosa decompression → ~1-2s backend processing
- **Sample Rate Consistency**: All audio normalized to 16kHz before WavLM (avoids expensive resampling)

### 8.2 Model Warmup
WavLM loading takes 7–8 seconds on first request:
```typescript
// App startup
useEffect(() => {
  fetch(`${BACKEND_URL}/warmup`).catch(console.error);
}, []);
```

### 8.3 Caching
- Audio uploads: Temporary cache cleared after 60 seconds
- Playlist states: Cached in Firestore (synced in real-time)
- Content pools: Fetched once per session, then queried locally

---

## 9. Error Handling

### 9.1 Audio Recording Failures
```typescript
try {
  await recording.unloadAsync();
} catch (e) {
  // "Only one Recording" error if not properly cleaned up
  console.error('Audio cleanup failed');
}
```

### 9.2 Backend Timeout Recovery
```typescript
// Retry logic in uploadAudioWithTimeout
const maxRetries = 3;
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const response = await fetch(url, { signal: abortSignal });
    return response.json();
  } catch (e) {
    if (attempt < maxRetries - 1) {
      await delay(1000 * (attempt + 1)); // Exponential backoff
    }
  }
}
```

### 9.3 Firestore Write Conflicts
```typescript
// Use merge to avoid overwriting entire docs
await setDoc(userRef, updateData, { merge: true });
```

---

## 10. Testing & Validation

### 10.1 Audio Format Validation
```python
# Backend validation
if file.filename.endswith('.wav'):
    # Linear PCM, direct load
    audio, sr = librosa.load(file, sr=16000)
elif file.filename.endswith('.m4a'):
    # AAC, requires decode
    sound = AudioSegment.from_file(file, format='m4a')
    audio = np.array(sound.get_array_of_samples()) / 32768.0
```

### 10.2 Seeding Test Data
```bash
# Populate content pools
npx tsx scripts/seed-all-content.ts
```

---

## Conclusion

StamFree's architecture balances **clinical accuracy** (WavLM-based fluency detection) with **user engagement** (real-time game feedback, progress tracking). The three-tier design ensures scalability: the frontend handles UI responsiveness, the backend focuses on compute-intensive AI analysis, and Firestore provides real-time synchronization across devices.
