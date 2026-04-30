# StamFree — Gamified Speech Therapy for Kids

StamFree is a mobile app that helps children with stuttering improve their speech through fun, interactive games. Powered by AI speech recognition, the app provides real-time feedback and tracks progress as kids practice speaking exercises designed by speech therapists.

## Features

### 🐍 **Snake Game** — Prolongation Training
Speak and hold sounds (like "Mmmmm") to move a snake along a path. Learn to sustain speech sounds smoothly without rushing.

### 🐢 **Turtle Game** — Rate Control
Speak sentences at a target speed (80–120 words per minute). Practice speaking at a natural, even pace without stuttering.

### 🎈 **Balloon Game** — Easy Onset
Gently begin words with soft vocal onsets. The app detects whether you start smoothly or with tension—immediate feedback helps you adjust.

### 🎯 **OneTap Game** — Impulse Control
Speak multi-syllable words without repetitions. Build confidence in fluent, uninterrupted speech.

### 📊 **Progress Tracking**
- Earn XP and unlock badges as you complete exercises
- View weekly stats and streaks
- Track improvement on each speech pattern over time

## How It Works

1. **Record your voice** — The app captures your speech in high quality
2. **AI analyzes** — A machine-learning model examines your pronunciation, speed, and fluency
3. **Instant feedback** — See whether you passed each exercise and tips for improvement
4. **Progress saved** — Your stats sync to the cloud so you can pick up where you left off

## Getting Started

### Installation
StamFree is currently in development. To test the app locally:

1. **Prerequisites**
   - Node.js (v16+) and npm installed
   - Python 3.8+ for the backend server
   - Git

2. **Clone the repository**
   ```bash
   git clone https://github.com/adithya59/StamFree.git
   cd StamFree
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   EXPO_PUBLIC_BACKEND_URL=http://localhost:5000
   ```

5. **Start the backend server**
   ```bash
   cd server
   python app.py
   ```
   The Flask server will start on `http://localhost:5000`

6. **Set up Google Cloud credentials** (Required for backend)
   
   The backend needs Google Cloud credentials for:
   - **Firestore**: User progress storage & content pools
   - **Google Speech-to-Text API**: WPM calculation in Turtle game
   
   **Setup steps:**
   
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Select your project (or create a new one)
   
   3. **Enable required APIs:**
      - Go to: APIs & Services → Library
      - Search for **"Cloud Speech-to-Text API"** → Click Enable
      - Search for **"Cloud Firestore API"** → Click Enable
      - (These must be enabled or the backend will fail)
   
   4. Generate service account credentials:
      - Go to: APIs & Services → Service Accounts
      - Click on your service account → Keys tab
      - Click **Add Key** → Create new key
      - Choose **JSON** format
      - A `.json` file downloads automatically
   
   5. Move the downloaded file to the project:
      ```bash
      cp ~/Downloads/your-project-xxxxx.json server/credentials.json
      ```
   
   ✅ **Verify it worked:**
   ```bash
   cat server/credentials.json | head -5
   # Should output JSON starting with { "type": "service_account", ...
   ```

7. **Seed Firestore with content** (One-time setup)
   
   Populate Firestore with game content:
   
   ```bash
   # Run the consolidated seed script (populates all content at once)
   npx ts-node scripts/seed-all-content.ts
   ```
   
   This seeds:
   - 🐍 **Snake phoneme pool** (16 phonemes for prolongation practice, Tiers 1-2)
   - 🐢 **Turtle content pool** (120 sentences for rate control, Tiers 1-3)
   - 🎯 **Tapping content pool** (24 words/sentences for impulse control, Tiers 1-3)
   
   > **Note**: You only need to run this script ONCE during initial deployment. The app will read from these collections at runtime.

8. **Start the backend server**
   
   ```bash
   cd server
   python app.py
   ```
   The Flask server will start on `http://localhost:5000`

9. **Start the Expo dev server**
   ```bash
   npx expo start
   ```

10. **Run on your device**
   - **Android**: Press `a` to open in Android emulator
   - **iOS**: Press `i` to open in iOS simulator
   - **Expo Go**: Scan the QR code with your phone using the Expo Go app

### System Requirements
- **iOS**: 13.0 or later (or iOS simulator)
- **Android**: 8.0 or later (or Android emulator)
- Stable internet connection (for AI analysis and progress sync)
- Microphone access enabled

## About the Model

StamFree uses a WavLM speech recognition model to analyze your speech in real time. This model is large (~500MB) and is downloaded separately during first use. You can also find it in the [Releases](../../releases) section of this repository if you need to pre-download it.

## Privacy & Security

- Your audio recordings are processed securely on our servers
- We never store audio files longer than needed for analysis
- Your progress data is encrypted and associated only with your account
- For children under 13, parental consent and email verification are required

## Troubleshooting

**Microphone not working?**
- Go to Settings → Apps → StamFree → Permissions → Microphone → Allow

**Exercises seem too easy/hard?**
- The app adjusts difficulty as you improve. Give it a few sessions!

**AI model not downloading?**
- Check your internet connection and restart the app
- Ensure you have at least 500MB of free storage

**Progress not syncing?**
- Sign out and back in (Settings → Account)
- Check that you're connected to Wi-Fi or cellular data

## Support

- **Report a bug**: [GitHub Issues](../../issues)
- **Documentation**: See `docs/` folder for architecture, backend API, and shared services
- **Contact**: [adithya59](https://github.com/adithya59)

## About StamFree

StamFree is an open-source, production-ready gamified speech therapy platform created to make speech therapy accessible and engaging. Built with React Native (Expo) for cross-platform mobile support and powered by WavLM AI for accurate speech analysis.

---