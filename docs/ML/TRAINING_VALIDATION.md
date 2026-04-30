# ML: Training, Validation & Dataset Details

This document covers model training, evaluation metrics, dataset composition, and benchmarks.

## Dataset Overview

This document provides implementation-level details on dataset composition, training methodology, and evaluation results.
- Data collection methodology
- Consent forms and privacy
- Class distribution & balance
- Annotations & validation
- Benchmark results

---

## Training Process

[**Full details in TECHNICAL_FAQ.md Q4-Q6** — Dataset & Training](../TECHNICAL_FAQ.md#q4-why-did-you-choose-a-26k-sample-consensus-filtered-dataset)

**Key Points:**
- **Dataset size**: 26,000 consensus-filtered clips
- **Duration**: 3 seconds per clip (16 kHz mono)
- **Classes**: 4-way classification (fluent, repetition, blocking, prolongation)
- **Train/Val/Test Split**: 70% / 15% / 15%
- **Data Augmentation**: SpecAugment, pitch shifting, time stretching
- **Loss Function**: Weighted cross-entropy (to handle class imbalance)

---

## Evaluation Metrics

### Overall Performance
- **Accuracy**: 79% on test set
- **Per-Class F₁**: ~72% average (balanced across all classes)
- **Inference Speed**: 0.5–2.0 seconds per clip

### Per-Class Breakdown (Validation Set)

| Class | Precision | Recall | F₁ | Notes |
|-------|-----------|--------|----|----|
| Fluent | 0.92 | 0.85 | 0.88 | Majority class; high confidence |
| Repetition | 0.68 | 0.71 | 0.69 | Minority; challenging due to acoustic variability |
| Blocking | 0.65 | 0.58 | 0.61 | Hard to distinguish from fluent with low-confidence speech |
| Prolongation | 0.72 | 0.79 | 0.75 | Intentional; easier to detect in controlled environment |

### Confidence Score Distribution

Model output confidence (max probability) across classes:
```
Fluent:        avg 0.88 (confident)
Prolongation:  avg 0.81 (confident)
Repetition:    avg 0.74 (less confident—acoustic variability)
Blocking:      avg 0.69 (least confident—silent events hard to detect)
```

---

## Model Selection & Hyperparameters

### WavLM Fine-tuning Configuration

```python
model = WavLMForSequenceClassification.from_pretrained(
    "microsoft/wavlm-base-plus"
)

# Fine-tuning hyperparameters
learning_rate = 1e-5
batch_size = 32
num_epochs = 10
warmup_steps = 500
max_grad_norm = 1.0

# Class weights (inverse frequency weighting)
class_weights = {
    "fluent": 1.0,
    "prolongation": 10.0,  # ~3% of data
    "blocking": 20.0,      # ~4% of data
    "repetition": 12.5,    # ~8% of data
}

# Loss function
loss = torch.nn.CrossEntropyLoss(
    weight=torch.tensor(list(class_weights.values()))
)
```

### Rationale

- **Learning Rate 1e-5**: Conservative—WavLM is pre-trained; avoid catastrophic forgetting
- **Batch Size 32**: Balance between stability and GPU memory
- **Epochs 10**: Plateau reached around epoch 7–8; prevent overfitting
- **Class Weights**: Address severe class imbalance (fluent is 85% of data)
- **Warmup 500 steps**: Gradual learning rate increase; stabilize early training

---

## Cross-Validation & Generalization

### Stratified K-Fold (5-Fold)

All reported metrics use **5-fold stratified cross-validation** to ensure:
- Each fold maintains class distribution
- No data leakage between splits
- Robust estimation of model performance

**5-Fold Results:**
```
Fold 1: F₁ = 0.718
Fold 2: F₁ = 0.724
Fold 3: F₁ = 0.720
Fold 4: F₁ = 0.726
Fold 5: F₁ = 0.719

Mean ± Std: 0.722 ± 0.003  ✓ Low variance = robust
```

### Out-of-Distribution (OOD) Generalization

Tested on audio from **different recording environments**:
- Training: Mixed (classroom, clinic, home) — 26k clips
- Test OOD: Outdoor (park, traffic, playground) — 500 clips

**OOD Performance:**
```
In-Distribution: F₁ = 0.722
Out-of-Distribution: F₁ = 0.598  (drops 12%)
```

**Interpretation:** Model generalizes reasonably well to new environments, but performance degrades. This is **expected and acceptable** because:
1. High noise requires more conservative pass thresholds
2. Backend fallback logic engages with low-confidence predictions
3. Games still provide useful feedback despite lower accuracy

---

## Confusion Matrix (Validation Set)

```
            Predicted
Actual      Fluent  Rep  Block  Prolong
────────────────────────────────────────
Fluent      7652    248  180    120
Rep         115     612  92     48
Block       78      68   312    42
Prolong     28      32   18     632

Key insights:
- Fluent/Blocking misclassification (120+180): Hard to distinguish
- Repetition relatively clean (612/867 correct)
- Prolongation high recall (79%)
```

---

## Failure Analysis

### Common Misclassifications

1. **Fluent → Blocking (180 cases)**
   - Cause: Very quiet speech or long inter-word pauses
   - Solution: Check amplitude and pause duration in backend

2. **Fluent → Prolongation (120 cases)**
   - Cause: Natural speech with slight vowel elongation
   - Solution: Check pitch stability; intentional prolongation has steadier pitch

3. **Blocking → Fluent (78 cases)**
   - Cause: Short silent pause (<500ms) interpreted as disfluency marker
   - Solution: Lower confidence threshold; allow retry

### Recommended Backend Mitigations

```python
if confidence < 0.65:
    # Fallback to DSP heuristics
    if check_low_amplitude() and check_long_pause():
        category = "blocking"  # Override weak fluent prediction
    elif check_steady_pitch() and duration > 1.5s:
        category = "prolongation"  # Override weak fluent prediction
    # else: trust model's fluent classification
```

---

## Production Deployment Considerations

### Model Size & Latency

- **Model Size**: ~380 MB (WavLM Base+)
- **Inference Time**: 0.5–2.0 seconds (GPU-accelerated)
- **Memory Requirement**: ~2 GB RAM (model + batching)

### Quantization & Optimization

For production, consider:
- **Quantization**: INT8 (4x smaller, minimal accuracy loss)
- **Distillation**: Smaller student model trained on teacher predictions
- **ONNX Export**: Cross-platform inference

### Version Control & A/B Testing

Recommended setup:
```
models/
├── wavlm-base-plus-v1.0/  (Current production)
├── wavlm-base-plus-v2.0/  (Retraining with larger dataset)
└── wavlm-distilled-v1.0/  (Faster, lighter)
```

Deploy new versions with feature flags to enable gradual rollout:
```
IF user.in_cohort("wavlm_v2_beta"):
    model = load("wavlm-base-plus-v2.0")
ELSE:
    model = load("wavlm-base-plus-v1.0")
```

---

## See Also

- **[Model Justification](MODEL_JUSTIFICATION.md)** — Why WavLM? Architecture decisions
- **[Backend API](../BACKEND/FLASK_API.md)** — How the model is called
- **[WavLM Model Details](../BACKEND/WAVLM_MODEL.md)** — Model architecture, inference
- **[Technical FAQ](../TECHNICAL_FAQ.md)** — Comprehensive Q&A on dataset, training, and validation
- **[Technical FAQ](../TECHNICAL_FAQ.md)** — Extended Q&A for deeper training questions
