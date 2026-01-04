import os
import io
import time
import uuid
import numpy as np
import librosa
import torch
import torch.nn.functional as F
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google.cloud import speech
from pydub import AudioSegment
from g2p_en import G2p
import nltk
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
import soundfile as sf

# ============================================================================
# StamFree Backend - WavLM Speech Analysis Server
# ============================================================================
# STARTUP OPTIMIZATION:
# - First request takes ~7-8s due to model warmup (cold start)
# - To eliminate this latency, call POST /warmup immediately after server starts
# - This caches the model in GPU/CPU memory for subsequent requests (~1-2s each)
# ============================================================================

# --- NLTK SETUP ---
try:
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('averaged_perceptron_tagger_eng')
    nltk.download('cmudict')

# --- CONFIGURATION ---
PORT = int(os.environ.get('PORT', 5000))
CREDENTIALS_PATH = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'credentials.json')

# --- WAVLM MODEL PATH ---
# Prefer environment variable MODEL_PATH; fallback to 'wavlm_model' folder
MODEL_PATH = os.environ.get("MODEL_PATH")
if not MODEL_PATH:
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "wavlm_model")
MODEL_PATH = os.path.abspath(MODEL_PATH)

if not os.path.exists(MODEL_PATH):
    raise ValueError(f"❌ Path not found: {MODEL_PATH}")

if not os.path.exists(os.path.join(MODEL_PATH, "config.json")):
    raise ValueError(
        f"❌ config.json not found in {MODEL_PATH}. Are you pointing to the right folder?"
    )

# Check Paths
if not os.path.exists(CREDENTIALS_PATH):
    print(f"⚠️ WARNING: Google Cloud credentials not found at {CREDENTIALS_PATH}")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH

# --- CONSTANTS & TUNING ---
SAMPLE_RATE = 16000
MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'wav', 'm4a', 'mp3', 'webm'}
SPEECH_PROB_MIN = float(os.environ.get("SPEECH_PROB_MIN", "0.35"))
PITCHED_RATIO_MIN = float(os.environ.get("PITCHED_RATIO_MIN", "0.15"))
PROGRESSION_CONFIDENCE = 0.75

# --- FLASK SETUP ---
app = Flask(__name__)
CORS(app)
g2p = G2p()

# --- KID FRIENDLY PHONEMES ---
PHONEME_MAP = {
    "AA": "a",
    "AE": "a",
    "AH": "u",
    "AO": "aw",
    "AW": "ow",
    "AY": "i",
    "B": "b",
    "CH": "ch",
    "D": "d",
    "DH": "th",
    "EH": "e",
    "ER": "er",
    "EY": "a",
    "F": "f",
    "G": "g",
    "HH": "h",
    "IH": "i",
    "IY": "ee",
    "JH": "j",
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ng",
    "OW": "o",
    "OY": "oy",
    "P": "p",
    "R": "r",
    "S": "s",
    "SH": "sh",
    "T": "t",
    "TH": "th",
    "UH": "u",
    "UW": "oo",
    "V": "v",
    "W": "w",
    "Y": "y",
    "Z": "z",
    "ZH": "zh",
}

# --- LOAD CUSTOM WAVLM MODEL ---
print("📥 Loading Custom WavLM Model...")
try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load the extractor and model from your local folder
    feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_PATH)
    model = AutoModelForAudioClassification.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval()  # Set to inference mode
    
    # Get Label Mappings from the trained model config
    id2label = model.config.id2label
    print(f"✅ WavLM Model Loaded on {device}!")
    print(f"   Labels: {id2label}")
except Exception as e:
    print(f"❌ Error Loading Model: {e}")
    print("   -> Ensure 'config.json' and 'pytorch_model.bin' are in the 'wavlm_model' folder.")
    raise e

# --- HELPER FUNCTIONS ---

def predict_file(audio_input):
    """
    Manual prediction using WavLM.
    Accepts a filepath (str) OR a pre-loaded numpy array.
    Returns: (label_string, confidence_float)
    """
    # 1. Load Audio if input is a path
    if isinstance(audio_input, str):
        try:
            # FAST PATH: Try soundfile first (for WAV)
            audio, sr = sf.read(audio_input)
            if sr != 16000:
                # Resample if not 16k
                audio = librosa.resample(y=audio, orig_sr=sr, target_sr=16000)
            # Ensure mono
            if len(audio.shape) > 1:
                audio = np.mean(audio, axis=1)
        except Exception:
            # FALLBACK: Librosa (handles mp3/m4a/resampling)
            audio, sr = librosa.load(audio_input, sr=16000)
    else:
        audio = audio_input  # Assume already at 16kHz

    # 2. Process Audio (Normalize & Extract Features)
    inputs = feature_extractor(
        audio,
        sampling_rate=16000,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=16000 * 3,  # Max 3 seconds context
    )

    # 3. Move to Device
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # 4. Model Inference
    with torch.no_grad():
        logits = model(**inputs).logits

    # 5. Softmax for Probabilities
    probs = torch.nn.functional.softmax(logits, dim=-1)

    # 6. Get Winner
    score, id = torch.max(probs, dim=-1)
    label = model.config.id2label[id.item()]

    return label, score.item()


def get_google_transcript(file_path):
    """Returns transcript and word-level timestamps."""
    try:
        client = speech.SpeechClient()
        audio = AudioSegment.from_file(file_path)
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        wav_data = io.BytesIO()
        audio.export(wav_data, format="wav")
        content = wav_data.getvalue()

        audio_file = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_word_time_offsets=True,
            enable_word_confidence=True,
        )
        response = client.recognize(config=config, audio=audio_file)

        words = []
        full_text = ""
        for result in response.results:
            full_text += result.alternatives[0].transcript + " "
            for w in result.alternatives[0].words:
                words.append(
                    {
                        "word": w.word,
                        "start": w.start_time.total_seconds(),
                        "end": w.end_time.total_seconds(),
                        "confidence": w.confidence,
                    }
                )
        return full_text.strip(), words
    except Exception as e:
        print(f"STT Error: {e}")
        return "", []


def calculate_wpm(words_data):
    """Calculate words per minute."""
    if not words_data or len(words_data) < 2:
        return 0
    first = words_data[0]
    last = words_data[-1]
    start = first.get("start", 0)
    end = last.get("end", start)
    duration = end - start
    if duration <= 0:
        return 0
    return round((len(words_data) / duration) * 60, 1)


def analyze_voicing_noise(filepath):
    """
    Return heuristics for anti-blow validation.
    """
    try:
        y, sr = librosa.load(filepath, sr=SAMPLE_RATE)
        if len(y) < int(0.3 * sr):
            return {
                "pitched_ratio": 0.0,
                "voiced_detected": False,
                "noise_suspected": True,
            }

        # Zero-crossing rate
        zcr = librosa.feature.zero_crossing_rate(y=y)[0]
        zcr_mean = float(np.mean(zcr))

        # Pitch detection (pyin)
        try:
            f0, _, _ = librosa.pyin(y, fmin=80, fmax=400, sr=sr)
            voiced_frames = np.sum(~np.isnan(f0))
            total_frames = len(f0)
            pitched_ratio = (
                float(voiced_frames) / float(total_frames) if total_frames > 0 else 0.0
            )
        except:
            pitched_ratio = 0.0

        voiced_detected = pitched_ratio >= PITCHED_RATIO_MIN
        noise_suspected = pitched_ratio < (PITCHED_RATIO_MIN * 0.67) and zcr_mean > 0.2

        return {
            "pitched_ratio": pitched_ratio,
            "zcr_mean": zcr_mean,
            "voiced_detected": voiced_detected,
            "noise_suspected": noise_suspected,
        }
    except Exception as e:
        print(f"Voicing analysis error: {e}")
        return {"voiced_detected": False, "noise_suspected": True}


def analyze_amplitude(filepath, threshold=0.02, min_duration=1.5):
    """Analyze sustained amplitude for Snake exercise."""
    try:
        audio, sr = librosa.load(filepath, sr=SAMPLE_RATE)
        audio, _ = librosa.effects.trim(audio, top_db=30)

        rms = librosa.feature.rms(y=audio)[0]
        frame_duration = len(audio) / sr / len(rms)

        above_threshold = rms > threshold
        sustained_frames = 0
        max_sustained = 0

        for val in above_threshold:
            if val:
                sustained_frames += 1
                max_sustained = max(max_sustained, sustained_frames)
            else:
                sustained_frames = 0

        sustained_duration = max_sustained * frame_duration
        amplitude_sustained = sustained_duration >= min_duration

        return {
            "duration_sec": round(sustained_duration, 2),
            "amplitude_sustained": amplitude_sustained,
        }
    except:
        return {"duration_sec": 0, "amplitude_sustained": False}


def detect_breath(filepath, silence_threshold=0.01, min_silence=0.3):
    """Detect breath pattern for Balloon exercise."""
    try:
        audio, sr = librosa.load(filepath, sr=SAMPLE_RATE)
        rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
        frame_duration = len(audio) / sr / len(rms)

        silence_frames = rms < silence_threshold
        has_silence = False
        silence_count = 0

        for i, is_silent in enumerate(silence_frames):
            if is_silent:
                silence_count += 1
            elif silence_count > 0:
                silence_duration = silence_count * frame_duration
                if silence_duration >= min_silence:
                    has_silence = True
                    if i < len(rms):
                        return {
                            "breath_detected": True,
                            "amplitude_onset": round(float(rms[i]), 3),
                        }
                silence_count = 0
        return {"breath_detected": has_silence, "amplitude_onset": 0.0}
    except:
        return {"breath_detected": False, "amplitude_onset": 0.0}


def get_feedback(exercise_type, is_hit, stutter_type=None):
    hit_msgs = {
        "turtle": ["Great! You spoke slowly and fluently.", "Awesome slow speech!"],
        "snake": [
            "Smooth prolongation! The snake loved that.",
            "Excellent sustained sound!",
        ],
        "balloon": ["Perfect easy onset!", "Great gentle start!"],
        "onetap": ["Fluent one-tap! Nailed it.", "Awesome! No bumps!"],
    }
    miss_msgs = {
        "turtle": "Try to keep it smooth and steady!",
        "snake": "Try to make it one smooth sound.",
        "balloon": "Remember: gentle breath, then soft start.",
        "onetap": "Almost! Try to make it smoother.",
    }
    import random

    if is_hit:
        return random.choice(hit_msgs.get(exercise_type, ["Great job!"]))
    return miss_msgs.get(exercise_type, "Give it another try!")


# --- MAIN ENDPOINT: GENERAL ANALYSIS ---
@app.route("/analyze_audio", methods=["POST"])
def analyze_audio():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    filename = secure_filename(file.filename)
    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)

    try:
        # 1. RUN WAVLM PREDICTION
        label, confidence = predict_file(filepath)

        # Logic: If label contains "fluent", it's fluent. Else it's a stutter.
        is_stutter = "fluent" not in label.lower()
        stutter_type = "Fluent"

        if is_stutter:
            if "_" in label:
                stutter_type = label.split("_")[1].capitalize()
            else:
                stutter_type = label.capitalize()

        # 2. GET TRANSCRIPT (for phonemes)
        full_text, words = get_google_transcript(filepath)
        final_phoneme = None

        if is_stutter and words:
            # Find the word with lowest confidence (often the stuttered one)
            culprit = min(words, key=lambda w: w["confidence"])

            phonemes = g2p(culprit["word"])
            clean = [p for p in phonemes if p not in [" ", "'"]]
            if clean:
                raw = "".join([i for i in clean[0] if not i.isdigit()])
                final_phoneme = PHONEME_MAP.get(raw, raw.lower())

        response = {
            "is_stutter": is_stutter,
            "stutter_score": confidence,
            "type": stutter_type,
            "problem_phoneme": final_phoneme,
            "transcript": full_text,
        }
        return jsonify(response)

    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


# --- EXERCISE ENDPOINTS ---


@app.route("/analyze/turtle", methods=["POST"])
def analyze_turtle():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    filename = secure_filename(file.filename)
    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)

    try:
        t0 = time.time()

        # 2. Run WavLM AI Prediction (Correctness)
        label, score = predict_file(filepath)

        # Buffer: Only trigger 'block' if the AI is very confident
        is_stutter = "fluent" not in label.lower()
        block_detected = "block" in label.lower() and score > 0.75

        # 3. Run Google STT & WPM Check (Speed)
        text, words = get_google_transcript(filepath)
        wpm = calculate_wpm(words) if words else 0

        # Content Matching Logic
        target_text = request.form.get("targetText", "")
        content_pass = True

        if target_text and text:
            # Simple set overlap check
            target_words = set(target_text.lower().split())
            spoken_words = set(text.lower().split())
            # Calculate intersection
            common = target_words.intersection(spoken_words)
            # Require at least 50% of target words to be present
            if len(common) < len(target_words) * 0.5:
                content_pass = False
                print(f"❌ Content Mismatch: Expected '{target_text}', Got '{text}'")

        # 4. TERMINAL LOGGING (Debug view for you to see possibilities)
        print("\n" + "🐢" * 15)
        print(f"DEBUG ANALYSIS: {filename}")
        print(f"WORD SAID: '{text}'")
        print(f"SPEED: {wpm} WPM (Target: 80-120)")
        print(f"AI LABEL: {label}")
        print(f"CONFIDENCE: {score:.4f}")
        print(f"BLOCK DETECTED: {block_detected}")
        print("🐢" * 15 + "\n")

        # 5. Define Passing Conditions
        # Therapeutic Target: 80 - 120 WPM (Turtle Mode)
        game_pass = 80 <= wpm <= 120
        clinical_pass = not block_detected

        # The turtle moves if BOTH conditions are met AND content matches
        is_hit = game_pass and clinical_pass and content_pass

        # Custom Feedback for Turtle
        if not content_pass:
            feedback = "Oops! That didn't sound quite right. Read the sentence on the screen! 🐢"
        elif wpm > 120:
            feedback = "Whoa! Too fast for a turtle. Try to slow down and say it again. 🐢"
        elif wpm < 80 and wpm > 0:
            feedback = "A bit too sleepy! Try to speed up just a little bit. 🐢"
        elif wpm == 0:
            feedback = "I couldn't hear you clearly. Try again? 🐢"
        elif block_detected:
            feedback = "Try to keep your speech smooth and flowing! 🐢"
        else:
            feedback = "Perfect turtle pace! Watch me go! 🌟"

        elapsed_ms = int((time.time() - t0) * 1000)

        # 6. Return Response to React Native App
        return jsonify(
            {
                "wpm": wpm,
                "game_pass": game_pass,
                "stutter_detected": is_stutter,
                "block_detected": block_detected,
                "clinical_pass": clinical_pass,
                "confidence": score,
                "transcript": text,
                "feedback": feedback,
                "elapsed_ms": elapsed_ms,
            }
        )

    except Exception as e:
        print(f"❌ Server Error in analyze_turtle: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # 7. Cleanup: Delete audio file to save space
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


@app.route("/analyze/snake", methods=["POST"])
def analyze_snake():
    # ---------------------------------------------------------
    # 1. SETUP & VALIDATION
    # ---------------------------------------------------------
    file = request.files.get("file") or request.files.get("audioFile")
    if not file:
        return jsonify({"error": "Missing audio", "code": "MISSING_FIELD"}), 400

    filename = secure_filename(file.filename)
    if not any(filename.lower().endswith(ext) for ext in [f".{e}" for e in ALLOWED_EXTENSIONS]):
        return jsonify({"error": "Invalid format", "code": "INVALID_FORMAT"}), 400

    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)
    
    # Retrieve Game Data
    target_phoneme = request.form.get("targetPhoneme") or request.form.get("prompt_phoneme")
    tier = int(request.form.get("tier", 1))  # Default to tier 1 if not provided

    try:
        t0 = time.time()
        
        # Initialize Score (Perfect Start) - Tier-based XP
        stars = 3
        # XP ranges by tier:
        # Tier 1: 5-10 XP (2-3 stars)
        # Tier 2: 15-20 XP (2-3 stars)
        # Tier 3: 20-30 XP (2-3 stars)
        if tier == 1:
            xp = 10  # Start at 10 for perfect (3 stars)
            penalty_per_error = 3  # -3 XP per error (2 stars = 7 XP, 1 star = 4 XP)
        elif tier == 2:
            xp = 20  # Start at 20 for perfect (3 stars)
            penalty_per_error = 5  # -5 XP per error (2 stars = 15 XP, 1 star = 10 XP)
        else:  # tier 3+
            xp = 30  # Start at 30 for perfect (3 stars)
            penalty_per_error = 7  # -7 XP per error (2 stars = 23 XP, 1 star = 16 XP)
        
        feedback_msgs = []
        
        # ---------------------------------------------------------
        # 2. RUN ANALYZERS
        # ---------------------------------------------------------
        
        # A. AI Check (WavLM) for Repetitions
        label, score = predict_file(filepath)
        repetition_detected = "repetition" in label.lower()

        # B. Amplitude Check (Continuity & Duration)
        amp_data = analyze_amplitude(filepath)
        
        # C. Voicing Check (Physics)
        voicing = analyze_voicing_noise(filepath)

        # D. Phoneme Validation (Google STT)
        full_text, words = get_google_transcript(filepath)
        
        # Helper: Check if transcript matches target
        phoneme_match = None
        if target_phoneme and words:
            # Reuse existing matching logic
            target = target_phoneme.strip().lower()
            found = False
            for w in words:
                try:
                    phonemes = g2p(w["word"])
                    clean = [p for p in phonemes if p not in [" ", "'"]]
                    for p in clean:
                        raw = "".join([i for i in p if not i.isdigit()])
                        mapped = PHONEME_MAP.get(raw, raw.lower())
                        if mapped.lower() == target:
                            found = True
                            break
                    if found:
                        break
                except:
                    pass
            phoneme_match = found
        
        # Conservative fallback: Keep phoneme_match as None if we cannot verify via STT
        # Do NOT assume a match based on WavLM score alone, as WavLM detects fluency, not phoneme correctness
        # If match is None (unverified), it won't trigger a penalty in RULE 3

        # ---------------------------------------------------------
        # 3. APPLY DEDUCTION LOGIC
        # ---------------------------------------------------------

        # RULE 1: CONTINUITY (Must be sustained without breaks)
        # Check amp_data['amplitude_sustained']
        if not amp_data["amplitude_sustained"]:
            stars -= 1
            xp -= penalty_per_error
            feedback_msgs.append("Keep the sound smooth without stopping!")

        # RULE 2: ANTI-BLOW / VOICING (Must hum, not blow)
        blow_detected = False
        if target_phoneme:
            voiced_targets = {'a','e','i','o','u','oo','ee','er','m','n','l','r','w','y','ng','v','z','j'}
            target_clean = target_phoneme.strip().lower()
            
            if target_clean in voiced_targets:
                # Evidence for speech: Voicing detected OR Phoneme matched
                speech_likely = voicing['voiced_detected'] or (phoneme_match is True)
                
                if not speech_likely:
                    blow_detected = True
                    stars -= 1
                    xp -= penalty_per_error
                    feedback_msgs.append("Don't just blow air! Use your voice.")

        # RULE 3: CONTENT (Must be the correct sound)
        if phoneme_match is False:
            # Definitely wrong sound detected - this is a critical failure
            # Deduct 2 stars (or force to 1 star minimum)
            stars -= 2
            xp -= penalty_per_error * 2
            feedback_msgs.append(f"I didn't hear the '{target_phoneme}' sound.")
        elif phoneme_match is None:
            # Unverified: Google STT couldn't confirm the phoneme
            # Cap at 2 stars max (can't get perfect score without verification)
            if stars == 3:
                stars = 2
                xp -= penalty_per_error // 2  # Half penalty for uncertainty
                feedback_msgs.append(f"Try to say '{target_phoneme}' more clearly!")

        # RULE 4: REPETITION (Must not stutter)
        # Only deduct if we haven't already deducted for amplitude (avoid double penalty)
        if repetition_detected:
            if amp_data["amplitude_sustained"]:
                stars -= 1
                xp -= penalty_per_error
                feedback_msgs.append("Try not to repeat the sound.")

        # ---------------------------------------------------------
        # 4. FINALIZE SCORES
        # ---------------------------------------------------------
        
        # Floor values: Minimum 1 Star for effort
        stars = max(1, stars)
        # Minimum XP based on tier: 1 XP for showing up
        xp = max(1, xp)
        
        # Determine strict Pass/Fail for the game loop
        # Pass = 2 or 3 stars. Fail = 1 star.
        is_pass = stars >= 2
        
        # Construct Feedback String
        final_feedback = " ".join(feedback_msgs) if feedback_msgs else "Perfect smooth speech! 🌟"

        # Determine Stutter Type (For analytics only, not scoring)
        stutter_type = "Fluent"
        if blow_detected:
            stutter_type = "Noise"
        elif repetition_detected:
            stutter_type = "Repetition"
        elif not amp_data["amplitude_sustained"]:
            stutter_type = "Block"
        elif phoneme_match is False:
            stutter_type = "Mismatch"

        # Calculate composite confidence (combines fluency + phoneme accuracy)
        # WavLM score is for fluency detection, but we need to adjust for phoneme correctness
        composite_confidence = float(score)  # Start with WavLM fluency score
        
        if phoneme_match is True:
            # Verified correct phoneme: Keep high confidence
            composite_confidence = min(0.95, composite_confidence + 0.05)
        elif phoneme_match is False:
            # Rejected (wrong phoneme): Reduce confidence significantly
            composite_confidence = min(0.65, composite_confidence * 0.65)
        elif phoneme_match is None:
            # Unverified: Moderate reduction (we can't confirm correctness)
            composite_confidence = min(0.80, composite_confidence * 0.85)
        
        # Further reduce if other issues detected
        if blow_detected:
            composite_confidence *= 0.7
        if not amp_data["amplitude_sustained"]:
            composite_confidence *= 0.8

        # Build response with both old format (for normalizeSnake) and new format (for debugging)
        response_payload = {
            # For normalizeSnake compatibility
            "game_pass": is_pass,
            "clinical_pass": not blow_detected and not repetition_detected,
            "feedback": final_feedback,
            "confidence": round(composite_confidence, 2),  # Use composite confidence
            "duration_sec": amp_data["duration_sec"],
            "amplitude_sustained": amp_data["amplitude_sustained"],
            "repetition_detected": repetition_detected,
            "isStutter": not is_pass,
            "phoneme_match": phoneme_match,
            "voiced_detected": voicing["voiced_detected"],
            "speech_prob": float(score),  # Keep original WavLM score for debugging
            
            # New format fields
            "sessionId": request.form.get("sessionId") or str(uuid.uuid4()),
            "stutterType": stutter_type,
            "starsAwarded": stars,
            "xp_earned": xp,
            
            # Debug Metrics
            "metrics": {
                "blow_detected": blow_detected,
                "repetition": repetition_detected,
                "continuity": amp_data["amplitude_sustained"],
                "match": phoneme_match,
                "transcript": full_text,  # What Google STT heard
                "match_status": "verified" if phoneme_match is True else ("rejected" if phoneme_match is False else "unverified")
            },
            "inferenceTimeMs": int((time.time() - t0) * 1000),
        }
        return jsonify(response_payload)

    except Exception as e:
        print(f"Snake Analysis Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


@app.route("/analyze/balloon", methods=["POST"])
def analyze_balloon():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    filename = secure_filename(file.filename)
    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)

    try:
        t0 = time.time()

        # 1. AI Check (WavLM)
        label, score = predict_file(filepath)

        # Hard attack often sounds like a block
        hard_attack = "block" in label.lower() or (
            score > 0.9 and "fluent" not in label.lower()
        )

        # 2. Breath Check
        breath_data = detect_breath(filepath)
        game_pass = breath_data["breath_detected"]

        clinical_pass = not hard_attack
        is_hit = game_pass and clinical_pass

        return jsonify(
            {
                "breath_detected": breath_data["breath_detected"],
                "amplitude_onset": breath_data["amplitude_onset"],
                "game_pass": game_pass,
                "hard_attack_detected": hard_attack,
                "clinical_pass": clinical_pass,
                "confidence": score,
                "feedback": get_feedback(
                    "balloon", is_hit, "Block" if hard_attack else None
                ),
                "elapsed_ms": int((time.time() - t0) * 1000),
            }
        )
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


@app.route("/analyze/onetap", methods=["POST"])
def analyze_onetap():
    """
    One-Tap Game Analysis: Word Count + Duration Validation
    
    Strategy:
    - Use Google STT to count words (1 word = success, >1 = repetition)
    - Validate duration (0.5x to 2.5x expected duration)
    - Use WavLM as fallback confidence check
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file"}), 400
    
    file = request.files["audio"]
    target_word = request.form.get("target_word", "").strip()
    syllables_json = request.form.get("syllables", "[]")
    duration = float(request.form.get("duration", 0))
    
    # Parse syllables
    import json
    try:
        syllables = json.loads(syllables_json)
    except:
        syllables = []
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)

    try:
        t0 = time.time()

        # 1. Google STT for word count
        transcript = ""
        word_count = 0
        stt_confidence = 0.0
        
        try:
            transcript, words_data = get_google_transcript(filepath)
            transcript = transcript.strip()
            
            # Count words
            word_list = [w for w in transcript.lower().split() if w]
            word_count = len(word_list)
            
            # Average word confidence
            if words_data:
                stt_confidence = sum(w.get("confidence", 0) for w in words_data) / len(words_data)
        except Exception as e:
            print(f"STT Error: {e}")
            word_count = -1

        # 2. Duration validation
        syllable_count = len(syllables) if syllables else 2
        expected_duration = (syllable_count * 0.15) + 0.5
        
        min_duration = expected_duration * 0.5
        max_duration = expected_duration * 2.5
        duration_valid = min_duration <= duration <= max_duration
        
        # 3. WavLM check
        label, wavlm_score = predict_file(filepath)
        is_fluent = "fluent" in label.lower()
        
        # 4. Final decision
        repetition_detected = False
        repetition_probability = 0.0
        
        if word_count > 1:
            repetition_detected = True
            repetition_probability = 0.9
        elif word_count == 1 and duration_valid and is_fluent:
            repetition_detected = False
            repetition_probability = 0.1
        elif not duration_valid and duration > max_duration:
            repetition_detected = True
            repetition_probability = 0.7
        elif not is_fluent:
            repetition_detected = True
            repetition_probability = wavlm_score
        else:
            repetition_detected = False
            repetition_probability = 0.3
        
        return jsonify(
            {
                "repetition_detected": repetition_detected,
                "repetition_probability": repetition_probability,
                "confidence": max(stt_confidence, wavlm_score),
                "word_count": word_count,
                "transcript": transcript,
                "duration_valid": duration_valid,
                "expected_duration": expected_duration,
                "wavlm_label": label,
                "wavlm_confidence": wavlm_score,
                "elapsed_ms": int((time.time() - t0) * 1000),
            }
        )
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


# --- WARMUP ENDPOINT (for cold-start optimization) ---
@app.route("/warmup", methods=["POST"])
def warmup():
    """
    Initialize model inference on a dummy audio to cache everything in memory.
    Call this endpoint once after server startup to avoid latency on first real request.
    """
    try:
        # Create a 0.5s silent audio buffer (16kHz, mono)
        dummy_audio = np.zeros(int(0.5 * 16000), dtype=np.float32)
        
        # Run a forward pass to warm up the model
        inputs = feature_extractor(
            dummy_audio,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            _ = model(**inputs).logits
        
        return jsonify({
            "status": "warmed_up",
            "model": "WavLM",
            "device": device,
            "message": "Model is now cached in memory for optimal performance"
        }), 200
    except Exception as e:
        print(f"⚠️ Warmup failed: {e}")
        return jsonify({"error": str(e)}), 500


# --- HEALTH CHECK ---
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok", 
        "model": "WavLM", 
        "device": device
    }), 200


if __name__ == "__main__":
    # Debug=False prevents reloading large models twice
    app.run(host="0.0.0.0", port=PORT, debug=False)
    warmup()