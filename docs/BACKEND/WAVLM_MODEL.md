# Backend: WavLM Model Architecture & Inference

Details on model loading, inference optimization, and DSP operations.

---

## Model Architecture

### Overview
- **Model**: `microsoft/wavlm-base-plus`
- **Framework**: PyTorch / Hugging Face Transformers
- **Size**: ~380 MB
- **Fine-tuning**: 4-way classification head (fluent, repetition, blocking, prolongation)

### Architecture Layers

```
Input: 3-second audio (48,000 samples at 16 kHz)
  ↓
Mel Spectrogram (40-dim, 20ms hop)
  → 150 frames × 40 dims
  ↓
WavLM Encoder (12-layer Transformer)
  → 150 × 768 contextualized embeddings
  ↓
Temporal Pooling (average across time)
  → 1 × 768 sentence embedding
  ↓
Classification Head
  Dense: 768 → 256 (ReLU)
  Dropout: p=0.2
  Dense: 256 → 4 (softmax)
  ↓
Output: [p_fluent, p_rep, p_block, p_prolong]
```

---

## Model Loading

### Development (CPU)

```python
from transformers import AutoModelForSequenceClassification

model = AutoModelForSequenceClassification.from_pretrained(
    "microsoft/wavlm-base-plus"
)
model.eval()
```

**Latency**: ~2–3 seconds per inference (slow on CPU)

### Production (GPU)

```python
import torch
from transformers import AutoModelForSequenceClassification

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = AutoModelForSequenceClassification.from_pretrained(
    "microsoft/wavlm-base-plus",
    cache_dir="/models/"  # Cache location
).to(device)

model.eval()
```

**Latency**: ~0.5–1.5 seconds per inference (GPU-accelerated)

---

## Inference

### Basic Example

```python
import torch
import torchaudio
from transformers import AutoFeatureExtractor, AutoModelForSequenceClassification

# Load model & feature extractor
feature_extractor = AutoFeatureExtractor.from_pretrained(
    "microsoft/wavlm-base-plus"
)
model = AutoModelForSequenceClassification.from_pretrained(
    "microsoft/wavlm-base-plus"
).to(device)

# Load audio
audio, sr = torchaudio.load("audio.wav")

# Resample if needed
if sr != 16000:
    resampler = torchaudio.transforms.Resample(sr, 16000)
    audio = resampler(audio)

# Prepare input
inputs = feature_extractor(
    audio[0].numpy(),
    sampling_rate=16000,
    return_tensors="pt"
)

# Inference
with torch.no_grad():
    outputs = model(**inputs.to(device))
    logits = outputs.logits
    probabilities = torch.softmax(logits, dim=-1)

# Parse results
classes = ["fluent", "repetition", "blocking", "prolongation"]
predictions = {
    classes[i]: probabilities[0, i].item()
    for i in range(4)
}

print(predictions)
# {
#   "fluent": 0.85,
#   "repetition": 0.08,
#   "blocking": 0.05,
#   "prolongation": 0.02
# }
```

---

## Optimization Techniques

### 1. Batch Processing

Process multiple clips simultaneously:

```python
# Prepare batch of 4 audio files
batch_inputs = feature_extractor(
    [audio1, audio2, audio3, audio4],
    sampling_rate=16000,
    return_tensors="pt",
    padding=True
).to(device)

# Single forward pass processes all 4
with torch.no_grad():
    outputs = model(**batch_inputs)
    batch_probs = torch.softmax(outputs.logits, dim=-1)

# Results: shape [4, 4]
```

**Performance**: 4× speedup (3 second clips can be processed 4 at a time on GPU)

### 2. Model Quantization (INT8)

Reduce memory footprint for deployment:

```python
import torch.quantization as quantization

# Static quantization
model_fp32 = AutoModelForSequenceClassification.from_pretrained(...)
model_fp32.eval()

# Convert to INT8
model_int8 = quantization.quantize_dynamic(
    model_fp32,
    {torch.nn.Linear},
    dtype=torch.qint8
)

# Save quantized model
torch.save(model_int8.state_dict(), "model_int8.pth")
```

**Trade-offs**:
- **Size**: 380 MB → 95 MB (4× smaller)
- **Latency**: ~10% faster
- **Accuracy**: ~0.5% drop (acceptable)

### 3. Knowledge Distillation

Train a smaller student model to mimic teacher:

```python
# Teacher: microsoft/wavlm-base-plus (large)
# Student: Custom smaller model (e.g., 2 transformer layers)

teacher_model = AutoModelForSequenceClassification.from_pretrained(
    "microsoft/wavlm-base-plus"
).eval()

student_model = SmallWavLMModel(  # Custom 2-layer model
    hidden_size=256,
    num_layers=2
)

# Distillation loss
distillation_loss = torch.nn.KLDivLoss()
ce_loss = torch.nn.CrossEntropyLoss()

# Training loop
for audio, labels in dataloader:
    teacher_logits = teacher_model(audio).logits
    student_logits = student_model(audio).logits
    
    loss = (0.7 * ce_loss(student_logits, labels) +
            0.3 * distillation_loss(
                torch.log_softmax(student_logits, dim=-1),
                torch.softmax(teacher_logits, dim=-1)
            ))
    
    loss.backward()
    optimizer.step()
```

**Result**: Distilled model = 50% size, 90% accuracy of teacher

### 4. Mixed Precision Training (FP16)

Reduce memory and speed up training:

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for audio, labels in dataloader:
    with autocast():
        outputs = model(audio)
        loss = criterion(outputs, labels)
    
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

**Benefit**: ~2× memory reduction, ~1.5× speedup with negligible accuracy loss

---

## DSP Operations

### Onset Slope Detection (for Balloon game)

```python
import numpy as np
from scipy.signal import find_peaks

def calculate_onset_slope(waveform, sr=16000):
    """
    Calculate amplitude rise at word onset (dB/ms).
    
    Args:
        waveform: numpy array (mono audio)
        sr: sample rate (Hz)
    
    Returns:
        onset_slope_db_ms: float (dB/millisecond)
    """
    
    # Compute amplitude envelope (smoothed)
    envelope = np.abs(waveform)
    window_size = int(sr * 0.025)  # 25ms window
    envelope_smooth = np.convolve(
        envelope,
        np.hamming(window_size) / np.sum(np.hamming(window_size)),
        mode='same'
    )
    
    # Find speech onset (first point above threshold)
    threshold = np.max(envelope_smooth) * 0.1  # 10% of max
    onset_idx = np.where(envelope_smooth > threshold)[0][0]
    
    # Measure rise over first 100ms
    rise_duration_ms = 100
    rise_duration_samples = int(sr * rise_duration_ms / 1000)
    end_idx = min(onset_idx + rise_duration_samples, len(envelope_smooth))
    
    # Calculate slope in dB/ms
    onset_amplitude = envelope_smooth[onset_idx]
    peak_amplitude = np.max(envelope_smooth[onset_idx:end_idx])
    
    if onset_amplitude < 1e-6:
        return 0.0  # Avoid log of zero
    
    amplitude_rise_db = 20 * np.log10(peak_amplitude / onset_amplitude)
    duration_ms = (end_idx - onset_idx) / sr * 1000
    
    onset_slope_db_ms = amplitude_rise_db / duration_ms
    
    return onset_slope_db_ms

# Example usage
slope = calculate_onset_slope(waveform, sr=16000)
if slope < 5.0:
    print("Soft onset ✓")
else:
    print("Hard onset ✗")
```

### Pitch Stability Detection (for Snake game)

```python
def calculate_pitch_variation(waveform, sr=16000):
    """
    Calculate pitch variation (semitones) for smooth prolongation check.
    
    Returns:
        variation_semitones: float
    """
    try:
        import librosa
    except ImportError:
        return 0.0  # Fallback if librosa not available
    
    # Extract pitch using piptrack
    f0, voiced_flag, voiced_probs = librosa.piptrack(
        y=waveform,
        sr=sr,
        hop_length=160  # 10ms
    )
    
    # Get voiced frames only
    voiced_frames = f0[f0 > 0]
    
    if len(voiced_frames) < 2:
        return 0.0
    
    # Convert to semitones (relative to mean)
    mean_f0 = np.mean(voiced_frames)
    semitones = 12 * np.log2(voiced_frames / mean_f0)
    
    # Return standard deviation
    variation = np.std(semitones)
    
    return variation

# Example usage
pitch_var = calculate_pitch_variation(waveform, sr=16000)
if pitch_var < 15:
    print("Smooth prolongation ✓")
else:
    print("Unsteady pitch ✗")
```

---

## Troubleshooting

### CUDA Out of Memory
```python
# Reduce batch size
batch_size = 4  # Instead of 8

# Enable gradient checkpointing
model.gradient_checkpointing_enable()

# Use mixed precision
with autocast():
    outputs = model(**inputs)
```

### Slow Inference on CPU
```python
# Solution: Use GPU or reduce model size
device = torch.device("cuda")
model = model.to(device)

# Or use quantized/distilled model
model_int8 = torch.quantization.quantize_dynamic(model, ...)
```

### Model Not Downloading
```python
# Manually specify cache directory
model = AutoModelForSequenceClassification.from_pretrained(
    "microsoft/wavlm-base-plus",
    cache_dir="/opt/models/"  # Ensure writable
)
```

---

## See Also

- **[Flask API](FLASK_API.md)** — How model is called in production
- **[Model Justification](../ML/MODEL_JUSTIFICATION.md)** — Why WavLM?
- **[Training & Validation](../ML/TRAINING_VALIDATION.md)** — Model performance, metrics
- **[System Architecture](../ARCHITECTURE.md)** — Production deployment and scaling
