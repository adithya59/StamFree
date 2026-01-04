"""
One-Tap Backend Analysis Endpoint Implementation Guide
Route: /analyze/onetap
Purpose: Detect repetitions via STT word count + duration validation

Key Strategy:
- Record WHOLE word in one go (not syllables separately)
- Use STT to count words in transcript
- word_count == 1 → Success (smooth delivery)
- word_count > 1 → Fail (repetition detected)
- Duration validation: too short/long = fail

Example Implementation:
"""

from flask import Flask, request, jsonify
import speech_recognition as sr
import tempfile
import os

app = Flask(__name__)

@app.route('/analyze/onetap', methods=['POST'])
def analyze_onetap():
    """
    Analyze One-Tap recording for repetitions
    
    Request:
        - audio: Audio file (m4a, wav, etc.)
        - target_word: Expected word (e.g., "Spaghetti")
        - syllables: JSON array of syllables (e.g., ["Spa", "ghet", "ti"])
        - duration: Recording duration in seconds
    
    Response:
        - repetition_detected: Boolean (True if word_count > 1 or duration invalid)
        - repetition_probability: Float 0-1
        - confidence: Float 0-1
        - word_count: Number of words detected by STT
        - transcript: Full STT transcript for debugging
        - duration_valid: Boolean (duration within acceptable range)
    """
    
    try:
        # 1. Parse request
        audio_file = request.files.get('audio')
        target_word = request.form.get('target_word')
        syllables = json.loads(request.form.get('syllables', '[]'))
        duration = float(request.form.get('duration', 0))
        
        if not audio_file or not target_word:
            return jsonify({'error': 'Missing audio or target_word'}), 400
        
        # 2. Save audio temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            audio_file.save(temp_audio.name)
            temp_path = temp_audio.name
        
        # 3. Duration Validation
        syllable_count = len(syllables)
        expected_duration = syllable_count * 0.4  # ~0.4s per syllable
        min_duration = expected_duration * 0.5    # Too fast (cut off/block)
        max_duration = expected_duration * 2.5    # Too slow (struggle)
        
        duration_valid = min_duration <= duration <= max_duration
        
        # 4. Google STT for word count
        recognizer = sr.Recognizer()
        
        with sr.AudioFile(temp_path) as source:
            audio_data = recognizer.record(source)
            
        try:
            # Use Google Speech Recognition
            transcript = recognizer.recognize_google(audio_data)
            transcript = transcript.lower().strip()
            
            # Count words (split by spaces)
            words = transcript.split()
            word_count = len(words)
            
            # Check if target word appears
            target_lower = target_word.lower()
            contains_target = target_lower in transcript
            
        except sr.UnknownValueError:
            # Could not understand audio
            transcript = ""
            word_count = 0
            contains_target = False
        except sr.RequestError as e:
            return jsonify({'error': f'STT service error: {e}'}), 500
        
        # 5. Decision Logic
        # PASS: word_count == 1 AND duration_valid AND contains_target
        # FAIL: word_count > 1 OR !duration_valid OR !contains_target
        
        repetition_detected = (
            word_count != 1 or 
            not duration_valid or 
            not contains_target
        )
        
        # Calculate confidence based on STT clarity
        if word_count == 0:
            confidence = 0.0  # No speech detected
        elif word_count == 1 and contains_target:
            confidence = 0.9  # High confidence pass
        elif word_count > 1:
            confidence = 0.8  # High confidence fail (repetition)
        else:
            confidence = 0.5  # Uncertain
        
        # Repetition probability (0 = no repetition, 1 = definite repetition)
        if word_count == 1 and duration_valid:
            repetition_probability = 0.0  # Clean delivery
        elif word_count > 1:
            repetition_probability = min(1.0, 0.5 + (word_count - 1) * 0.3)
        elif not duration_valid:
            repetition_probability = 0.6  # Likely struggle
        else:
            repetition_probability = 0.5  # Uncertain
        
        # 6. Cleanup
        os.unlink(temp_path)
        
        # 7. Response
        return jsonify({
            'repetition_detected': repetition_detected,
            'repetition_probability': repetition_probability,
            'confidence': confidence,
            'word_count': word_count,
            'transcript': transcript,
            'duration_valid': duration_valid,
            'contains_target': contains_target,
            'expected_duration': expected_duration,
            'actual_duration': duration,
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


"""
Example Test Cases:

1. Perfect Delivery:
   - Audio: User says "Banana" once smoothly
   - STT: "banana"
   - word_count: 1
   - duration: 0.9s (valid for 3 syllables: 0.6s - 3.0s)
   - Result: repetition_detected = False ✓

2. Stuttering/Repetition:
   - Audio: User says "Ba-ba-banana"
   - STT: "ba banana" OR "banana banana"
   - word_count: 2
   - Result: repetition_detected = True ✗

3. Block (Too Short):
   - Audio: User cuts off "Ban—" (incomplete)
   - STT: "ban" (incomplete word)
   - word_count: 1 but !contains_target OR duration too short
   - Result: repetition_detected = True ✗

4. Prolongation (Too Long):
   - Audio: User says "Baaaaanaaaaanaaa" (stretched)
   - STT: "banana" (might still be 1 word)
   - duration: 5.0s (too long for 3 syllables: expected 1.2s, max 3.0s)
   - Result: repetition_detected = True (duration_valid = False) ✗

Usage:
1. Add this route to server/app.py
2. Install dependencies: pip install SpeechRecognition pydub
3. Test with: curl -X POST -F "audio=@test.wav" -F "target_word=Banana" \
               -F "syllables=[\"Ba\",\"na\",\"na\"]" -F "duration=0.9" \
               http://localhost:5000/analyze/onetap
"""
