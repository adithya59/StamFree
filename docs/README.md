# 📚 StamFree Documentation Hub

Welcome! This is the central documentation for StamFree, a gamified speech therapy app for children with stuttering. Choose your path based on your needs.

---

## 🎮 Game Developers & Designers

**Want to understand how games work?**

Start here: [Games Overview & Architecture](GAMES/INDEX.md)

Then dive into specific games:
- **[🐍 Snake Game](GAMES/SNAKE.md)** — Prolongation training mechanics
- **[🐢 Turtle Game](GAMES/TURTLE.md)** — Rate control with WPM calculation
- **[🎈 Balloon Game](GAMES/BALLOON.md)** — Easy onset & DSP analysis
- **[🎯 Tapping Game](GAMES/TAPPING.md)** — Repetition detection

---

## 🤖 Machine Learning & AI Engineers

**Want to understand the WavLM model, training, and evaluation?**

Start here: [Model Justification & Design](ML/MODEL_JUSTIFICATION.md)

Then explore:
- **[Training & Validation Details](ML/TRAINING_VALIDATION.md)** — Dataset, training process, evaluation metrics
- **[Backend API Reference](BACKEND/FLASK_API.md)** — Endpoints, response formats, error handling

---

## 🔧 Backend & DevOps Engineers

**Want to deploy, scale, and operate the system?**

Start here: [System Architecture](ARCHITECTURE.md) — High-level system design

Then explore:
- **[Flask API Reference](BACKEND/FLASK_API.md)** — All endpoints, authentication, rate limiting
- **[WavLM Model Details](BACKEND/WAVLM_MODEL.md)** — Model loading, inference, optimization


---

## 📋 Clinical & Product Leads

**Want to understand clinical design, user experience, and clinical validation?**

Start here: [System Architecture](ARCHITECTURE.md#clinical-foundations)

Then explore:
- **[Firestore Schema](ARCHITECTURE.md#firestore-schema--data-persistence)** — How user progress is stored
- **[Technical FAQ](TECHNICAL_FAQ.md)** — Clinical design foundations and evidence-based decisions

---

## 🎓 Academic & Technical Reference

**Need deep technical answers or comprehensive system documentation?**

Our Technical FAQ covers advanced topics for researchers, engineers preparing academic submissions, and those requiring in-depth architectural analysis:

👉 **[Technical FAQ](TECHNICAL_FAQ.md)** ← Start here for comprehensive technical reference

**Coverage:**
- **Q1-Q3**: Machine Learning architecture, model selection, WavLM design
- **Q4-Q6**: Dataset composition, training methodology, validation results
- **Q7-Q9**: Clinical foundations, UX design decisions, engagement metrics
- **Q10**: Deployment infrastructure, operations, scaling strategies
- **Q11**: System architecture, data persistence, security considerations

---

## 🚀 Quick Start (New to Project?)

1. **Read This First**: [System Architecture](ARCHITECTURE.md) (5 min read)
   - High-level overview of how the app works end-to-end

2. **Then Pick Your Path**:
   - **Game Development**: [Games Overview](GAMES/INDEX.md)
   - **AI/ML**: [Model Justification](ML/MODEL_JUSTIFICATION.md)
   - **Backend/Ops**: [System Architecture](ARCHITECTURE.md)
   - **Technical Deep Dive**: [Technical FAQ](TECHNICAL_FAQ.md)

3. **Go Deeper**: Follow links in each document to related resources

---

## 📂 Documentation Structure

```
docs/
├── README.md (YOU ARE HERE)
├── ARCHITECTURE.md (★ START HERE if new)
├── TECHNICAL_FAQ.md (Comprehensive Technical FAQ)
│
├── GAMES/
│   ├── INDEX.md (Overview of all 4 games)
│   ├── SNAKE.md (Prolongation training)
│   ├── TURTLE.md (Rate control)
│   ├── BALLOON.md (Easy onset)
│   └── TAPPING.md (Impulse control)
│
├── ML/
│   ├── MODEL_JUSTIFICATION.md (Why WavLM? vs. alternatives)
│   └── TRAINING_VALIDATION.md (Training process, evaluation)
│
└── BACKEND/
    ├── FLASK_API.md (All REST endpoints)
    └── WAVLM_MODEL.md (Model architecture, inference)
```

---

## 🔗 Cross-Document Navigation

Each document is **self-contained** but links to related sections:

- **ARCHITECTURE.md** ← Foundational (read first)
- **GAMES/** ← Depends on ARCHITECTURE + BACKEND/FLASK_API
- **ML/** ← Depends on TRAINING_VALIDATION + BACKEND/WAVLM_MODEL
- **BACKEND/** ← Foundational for all backend work

---

## 🤔 Common Questions

**"Where is user progress stored?"**  
→ See [Firestore Schema](ARCHITECTURE.md#firestore-schema--data-persistence) in ARCHITECTURE.md

**"How does the WavLM model work?"**  
→ See [Model Justification](ML/MODEL_JUSTIFICATION.md)

**"How do I deploy to production?"**  
→ See [System Architecture](ARCHITECTURE.md)

**"What are the game rules and progression logic?"**  
→ See [Games Overview](GAMES/INDEX.md)

**"How is user data collected and validated?"**  
→ See [Technical FAQ](TECHNICAL_FAQ.md)

**"I'm preparing for a technical exam or need deep technical answers. Where do I start?"**  
→ See [Technical FAQ](TECHNICAL_FAQ.md)

---

## 📖 Reading Time Estimates

| Document | Time | Audience |
|----------|------|----------|
| ARCHITECTURE.md | 20 min | Everyone (foundational) |
| GAMES/INDEX.md | 10 min | Game developers |
| GAMES/{SNAKE\|TURTLE\|BALLOON\|TAPPING}.md | 15 min each | Game developers |
| ML/MODEL_JUSTIFICATION.md | 15 min | ML engineers, researchers |
| ML/TRAINING_VALIDATION.md | 15 min | ML engineers, researchers |
| BACKEND/FLASK_API.md | 10 min | Backend engineers |
| BACKEND/WAVLM_MODEL.md | 15 min | Backend engineers |
| TECHNICAL_FAQ.md | 45 min | Academic & technical audiences |

---

## ✨ Latest Documentation Updates

- ✅ **Games split**: Individual game files for easier navigation
- ✅ **ML & Backend**: Focused documentation by domain
- ✅ **Navigation Hub**: This README with guided paths
- ✅ **Deployment**: Consolidated seeding script (`scripts/seed-all-content.ts`)

---

## 📞 Questions or Feedback?

- 📧 **Report issues**: [GitHub Issues](../../issues)
- 💬 **Suggest improvements**: Open a PR with documentation updates
- 🐛 **Found a typo?**: PRs welcome!

---

**Last Updated**: April 2026  
**Audience**: Game devs, ML engineers, backend engineers, clinical leads, academic audiences
