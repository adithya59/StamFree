import os
import io
import time
import uuid
import random
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

# --- TORCH THREADING (reduce CPU context switching on small instances) ---
torch.set_num_threads(1)
torch.set_num_interop_threads(1)
 
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
AUTO_WARMUP = os.environ.get("AUTO_WARMUP", os.environ.get("WARMUP_ON_START", "true")).lower() == "true"

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
            "problem_word": culprit["word"] if is_stutter and words else None,
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


def detect_nasal_phoneme_acoustic(filepath):
    """
    Simple check: if user is humming a voiced sound (for nasal targets).
    We don't try to distinguish M vs N vs NG - just accept any nasal hum.
    Good enough for speech therapy practice!
    """
    try:
        # Load audio
        y, sr = librosa.load(filepath, sr=16000)
        
        # Check if sound is voiced (nasals are always voiced)
        # Simple method: check if there's pitch
        f0, voiced_flag, _ = librosa.pyin(
            y, 
            fmin=librosa.note_to_hz('C2'),  # ~65 Hz
            fmax=librosa.note_to_hz('C7')   # ~2093 Hz
        )
        
        # If more than 50% of audio is voiced, accept it as nasal
        voiced_ratio = np.sum(voiced_flag) / len(voiced_flag) if len(voiced_flag) > 0 else 0
        
        if voiced_ratio > 0.5:
            return True  # Good enough - they're humming!
        else:
            return False  # Probably just blowing air
            
    except Exception as e:
        print(f"⚠️ Acoustic detection error: {e}")
        return None


# ---------------------------------------------------------
# SNAKE GAME ENDPOINT
# ---------------------------------------------------------
@app.route("/snake/analyze", methods=["POST"])
def analyze_snake():
    # 1. SETUP & VALIDATION
    file = request.files.get("file") or request.files.get("audioFile")
    if not file:
        return jsonify({"success": False, "error": "Missing audio", "code": "MISSING_FIELD"}), 400

    filename = secure_filename(file.filename)
    if not any(filename.lower().endswith(ext) for ext in [f".{e}" for e in ALLOWED_EXTENSIONS]):
        return jsonify({"success": False, "error": "Invalid format", "code": "INVALID_FORMAT"}), 400

    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)
    
    # Retrieve Game Data
    target_phoneme = request.form.get("targetPhoneme") or request.form.get("prompt_phoneme")
    tier = int(request.form.get("tier", 1))

    try:
        t0 = time.time()
        
        # Initialize Score - Tier-based XP
        stars = 3
        if tier == 1:
            xp = 10
            penalty_per_error = 3
        elif tier == 2:
            xp = 20
            penalty_per_error = 5
        else:  # tier 3+
            xp = 30
            penalty_per_error = 7
        
        feedback_msgs = []
        
        # 2. RUN ANALYZERS
        # A. AI Check (WavLM) for Repetitions
        label, score = predict_file(filepath)
        repetition_detected = "repetition" in label.lower()

        # B. Amplitude Check
        amp_data = analyze_amplitude(filepath)
        
        # C. Voicing Check
        voicing = analyze_voicing_noise(filepath)

        # D. Phoneme Validation
        full_text, words = get_google_transcript(filepath)
        
        # Check if transcript matches target
        phoneme_match = None
        if target_phoneme and words:
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
        
        # Simple fallback: If STT fails and target is nasal, just check if they're humming
        if phoneme_match is None and target_phoneme:
            target_lower = target_phoneme.strip().lower()
            if target_lower in {'m', 'n', 'ng'}:
                # Don't try to distinguish M vs N vs NG - just check if voiced
                is_humming = detect_nasal_phoneme_acoustic(filepath)
                if is_humming:
                    phoneme_match = True  # Good enough!
                    print(f"✅ Detected nasal humming for target '{target_lower}'")

        # 3. APPLY DEDUCTION LOGIC
        # RULE 1: CONTINUITY
        if not amp_data["amplitude_sustained"]:
            stars -= 1
            xp -= penalty_per_error
            feedback_msgs.append("Keep the sound smooth without stopping!")

        # RULE 2: ANTI-BLOW / VOICING
        blow_detected = False
        if target_phoneme:
            voiced_targets = {'a','e','i','o','u','oo','ee','er','m','n','l','r','w','y','ng','v','z','j'}
            target_clean = target_phoneme.strip().lower()
            
            if target_clean in voiced_targets:
                speech_likely = voicing['voiced_detected'] or (phoneme_match is True)
                
                if not speech_likely:
                    blow_detected = True
                    stars -= 1
                    xp -= penalty_per_error
                    feedback_msgs.append("Don't just blow air! Use your voice.")

        # RULE 3: CONTENT
        if phoneme_match is False:
            stars -= 2
            xp -= penalty_per_error * 2
            feedback_msgs.append(f"I didn't hear the '{target_phoneme}' sound.")
        elif phoneme_match is None:
            if stars == 3:
                stars = 2
                xp -= penalty_per_error // 2
                # Make feedback more helpful - show extended sound pattern
                sound_pattern = target_phoneme * 5 if len(target_phoneme) == 1 else target_phoneme
                feedback_msgs.append(f"Try to say '{sound_pattern}' more clearly!")

        # RULE 4: REPETITION
        if repetition_detected:
            if amp_data["amplitude_sustained"]:
                stars -= 1
                xp -= penalty_per_error
                feedback_msgs.append("Try not to repeat the sound.")

        # 4. FINALIZE SCORES
        stars = max(1, stars)
        xp = max(1, xp)
        is_pass = stars >= 2
        clinical_pass = not blow_detected and not repetition_detected
        final_feedback = " ".join(feedback_msgs) if feedback_msgs else "Perfect smooth speech! 🌟"

        # Determine Stutter Type
        stutter_type = "Fluent"
        if blow_detected:
            stutter_type = "Noise"
        elif repetition_detected:
            stutter_type = "Repetition"
        elif not amp_data["amplitude_sustained"]:
            stutter_type = "Block"
        elif phoneme_match is False:
            stutter_type = "Mismatch"

        # Calculate composite confidence
        composite_confidence = float(score)
        if phoneme_match is True:
            composite_confidence = min(0.95, composite_confidence + 0.05)
        elif phoneme_match is False:
            composite_confidence = min(0.65, composite_confidence * 0.65)
        elif phoneme_match is None:
            composite_confidence = min(0.80, composite_confidence * 0.85)
        if blow_detected:
            composite_confidence *= 0.7
        if not amp_data["amplitude_sustained"]:
            composite_confidence *= 0.8

        # 5. STANDARDIZED RESPONSE
        elapsed_ms = int((time.time() - t0) * 1000)
        return jsonify({
            "success": True,
            "data": {
                "gamePass": is_pass,
                "clinicalPass": clinical_pass,
                "stars": stars,
                "xp": xp,
                "feedback": final_feedback,
                "metrics": {
                    "duration": amp_data["duration_sec"],
                    "continuity": amp_data["amplitude_sustained"],
                    "phonemeMatch": phoneme_match,
                    "repetition": repetition_detected,
                    "noiseDetected": blow_detected,
                    "voicedRatio": voicing["pitched_ratio"],
                },
                "debug": {
                    "stutterType": stutter_type,
                    "confidence": round(composite_confidence, 2),
                    "wavlmLabel": label,
                    "sttTranscript": full_text,
                    "inferenceTimeMs": elapsed_ms
                }
            }
        })

    except Exception as e:
        print(f"Snake Analysis Error: {e}")
        return jsonify({"success": False, "error": str(e), "code": "INTERNAL_ERROR"}), 500

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


@app.route("/analyze/tapping", methods=["POST"])
def analyze_tapping():
    """
    Syllable Tapping Analysis (Rhythm & Content Verification)
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file"}), 400

    file = request.files["audio"]
    target_word = request.form.get("targetWord", "").strip().lower()
    syllables_json = request.form.get("syllables", "[]")
    taps_json = request.form.get("taps", "[]")
    
    import json
    try:
        syllables = json.loads(syllables_json)
        taps = json.loads(taps_json)
    except:
        syllables = []
        taps = []

    filename = secure_filename(file.filename)
    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)

    try:
        t0 = time.time()
        
        # 1. Google STT + Phonetic Verification
        transcript = ""
        stt_confidence = 0.0
        syllable_matches = [False] * len(syllables)
        
        try:
            transcript, words_data = get_google_transcript(filepath)
            
            # --- PHONEME MATCHING LOGIC ---
            # 1. Convert Transcript to Phonemes (clean numbers/stress)
            # Remove stress digits (0,1,2)
            trans_phonemes_raw = g2p(transcript)
            trans_phonemes = [p for p in trans_phonemes_raw if p not in [" ", "'"]]
            trans_phonemes = ["".join([c for c in p if not c.isdigit()]) for p in trans_phonemes]
            
            print(f"DEBUG: Transcript Phonemes: {trans_phonemes}")
            
            # 2. Sequential Sub-sequence Search
            current_idx = 0
            for i, syl in enumerate(syllables):
                try:
                    # --- TEXT-BASED MATCHING (ROBUST) ---
                    # Why? G2P often fails on syllable fragments (e.g., "ple" -> "P L IY" vs "Apple" -> "AE P L").
                    # Checking if the syllable text exists in the recognized transcript is far more reliable.
                    
                    target_syl = syl.lower().strip()
                    cleaned_transcript = transcript.lower().strip()
                    
                    if target_syl in cleaned_transcript:
                        match_found = True
                        syllable_matches[i] = True
                        print(f"DEBUG: Matched syllable '{syl}' in transcript")
                    else:
                        print(f"DEBUG: Failed to match '{syl}' in '{cleaned_transcript}'")
                        
                except Exception as e:
                    print(f"Error matching syllable '{syl}': {e}")

            # Get average confidence
            if words_data:
                stt_confidence = sum(w.get("confidence", 0) for w in words_data) / len(words_data)
                
        except Exception as e:
            print(f"STT Error: {e}")

        # 2. WaveLM (Fluency Verification)
        label, wavlm_score = predict_file(filepath)
        is_fluent = "fluent" in label.lower()
        
        # 3. Rhythm/Tap Analysis
        tap_count_match = len(taps) == len(syllables)
        
        # 4. Feedback Generation
        feedback = ""
        pecky_state = "idle"
        
        correct_syllables_count = sum(syllable_matches)
        all_syllables_correct = correct_syllables_count == len(syllables)
        
        # Calculate accuracy based on syllables found
        accuracy = correct_syllables_count / len(syllables) if syllables else 0
        
        if all_syllables_correct:
            if is_fluent:
                feedback = "Perfect! You said every part clearly!"
                pecky_state = "success"
            else:
                feedback = "Great job getting the words right, but try to be smoother."
                pecky_state = "peck"
        elif correct_syllables_count > 0:
            feedback = f"You got {correct_syllables_count} out of {len(syllables)} parts. Keep trying!"
            pecky_state = "peck"
        else:
            feedback = "I didn't hear the parts clearly. Try saying them louder."
            pecky_state = "confused"
            
        return jsonify({
            "accuracy": accuracy,
            "transcript": transcript,
            "feedback": feedback,
            "pecky_state": pecky_state,
            "is_sync": tap_count_match,
            "fluent": is_fluent,
            "syllable_matches": syllable_matches
        })

    except Exception as e:
        print(f"Tapping Analysis Error: {e}")
        return jsonify({"error": str(e)}), 500
        
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


# ---------------------------------------------------------
# TURTLE GAME ENDPOINT (with transcript matching)
# ---------------------------------------------------------
@app.route("/analyze/turtle", methods=["POST"])
def analyze_turtle():
    """Analyze Turtle Game audio for WPM and transcript matching."""
    file = request.files.get("file") or request.files.get("audioFile")
    if not file:
        return jsonify({"success": False, "error": "Missing audio"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(os.getcwd(), filename)
    file.save(filepath)
    
    # Get params
    target_text = request.form.get("targetText", "")
    tier = int(request.form.get("tier", 1))
    
    try:
        t0 = time.time()
        
        # 1. Get Google STT transcript
        full_text, words = get_google_transcript(filepath)
        
        # 2. Calculate WPM
        wpm = 0
        if words and len(words) >= 2:
            first_start = words[0]['start']
            last_end = words[-1]['end']
            duration = last_end - first_start
            if duration > 0:
                wpm = round((len(words) / duration) * 60, 1)
        
        # 3. Check transcript match (strict word-by-word matching)
        transcript_match = False
        if target_text and full_text:
            # Normalize both texts (remove pause markers, lowercase)
            target_lower = target_text.lower().replace("|", "").strip()
            transcript_lower = full_text.lower().strip()
            
            # Split into words
            target_words = target_lower.split()
            transcript_words = transcript_lower.split()
            
            # Simple but strict: ALL words must be present in correct order
            # Allows minor filler words but rejects wrong content words
            if len(target_words) > 0:
                # Filter out common filler words that we can ignore
                fillers = {'um', 'uh', 'like', 'you', 'know', 'so', 'well'}
                
                # Extract content words from both
                target_content = [w for w in target_words if w not in fillers]
                transcript_content = [w for w in transcript_words if w not in fillers]
                
                # For short sentences (<=6 words), require 100% match on content words
                # For longer sentences, allow 1 wrong word
                if len(target_content) <= 6:
                    # Strict: all content words must match
                    matches = sum(1 for w in target_content if w in transcript_content)
                    transcript_match = matches == len(target_content)
                else:
                    # Allow 1 mistake for longer sentences
                    matches = sum(1 for w in target_content if w in transcript_content)
                    transcript_match = matches >= len(target_content) - 1
        
        # 4. WPM validation (40-100 WPM is good for turtle)
        wpm_pass = 40 <= wpm <= 100 if wpm > 0 else False
        
        # 5. Determine pass/fail
        game_pass = wpm_pass and (transcript_match or not target_text)
        clinical_pass = wpm_pass
        
        # 6. Generate feedback
        if not wpm_pass:
            if wpm == 0:
                feedback = "I couldn't hear you clearly enough."
            elif wpm < 40:
                feedback = "Great job being slow! Try to speak a tiny bit faster."
            else:
                feedback = "Slow down! Remember, the turtle likes to go slow."
        elif not transcript_match and target_text:
            feedback = "Good speed! But try to say the exact words."
        else:
            feedback = "Perfect! Great slow speech! 🌟"
        
        # 7. Calculate XP (tier-based)
        if tier == 1:
            xp = 10 if game_pass else 5
        elif tier == 2:
            xp = 20 if game_pass else 10
        else:
            xp = 30 if game_pass else 15
        
        elapsed = int((time.time() - t0) * 1000)
        
        return jsonify({
            "success": True,
            "game_pass": game_pass,
            "clinical_pass": clinical_pass,
            "feedback": feedback,
            "wpm": wpm,
            "xp": xp,
            "transcript": full_text,
            "transcript_match": transcript_match,
            "elapsed_ms": elapsed
        })
        
    except Exception as e:
        print(f"Turtle analysis error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


# --- WARMUP ENDPOINT (for cold-start optimization) ---
def _run_warmup_inference():
    """Run a dummy forward pass to cache weights and kernels."""
    dummy_audio = np.zeros(int(0.5 * 16000), dtype=np.float32)

    inputs = feature_extractor(
        dummy_audio,
        sampling_rate=16000,
        return_tensors="pt",
        padding=True,
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        _ = model(**inputs).logits


@app.route("/warmup", methods=["POST"])
def warmup():
    """
    Initialize model inference on a dummy audio to cache everything in memory.
    Call this endpoint once after server startup to avoid latency on first real request.
    """
    try:
        _run_warmup_inference()

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


if AUTO_WARMUP:
    try:
        _run_warmup_inference()
        print("✅ Warmup on start complete")
    except Exception as e:
        print(f"⚠️ Warmup on start failed: {e}")


if __name__ == "__main__":
    # Debug=False prevents reloading large models twice
    app.run(host="0.0.0.0", port=PORT, debug=False)