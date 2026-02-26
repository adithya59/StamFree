// Copy of the logic from services/turtleLogic.ts to avoid ts-node module resolution issues with Expo presets

type RateStatus = 'too_fast' | 'too_slow' | 'perfect';

interface RateResult {
    wpm: number;
    status: RateStatus;
    feedback: string;
}

// Define the WPM ranges for each tier
const TIER_RANGES = {
    1: { min: 40, max: 70, name: 'Jungle' },   // Very slow, control
    2: { min: 60, max: 90, name: 'River' },    // Slow + smooth
    3: { min: 80, max: 110, name: 'Mountain' } // Near-normal, controlled
};

/**
 * Calculates the speaking rate and returns a status based on therapeutic targets.
 */
function calculateSpeakingRate(
    wordCount: number,
    durationMs: number,
    tier: number = 1 // Default to Tier 1 if not specified
): RateResult {
    // 1. Convert duration to minutes
    const durationMin = durationMs / 1000 / 60;

    // 2. Calculate WPM
    if (durationMin < 0.005) { // Guard against extremely short clips (<0.3s)
        return { wpm: 0, status: 'too_fast', feedback: 'Too short! Try saying the whole thing. 🐢' };
    }

    const wpm = Math.round(wordCount / durationMin);

    // 3. Get tier constraints (fallback to Tier 1 if invalid tier passed)
    // @ts-ignore
    const range = TIER_RANGES[tier] || TIER_RANGES[1];

    // 4. Determine Status based on Tier
    if (wpm > range.max) {
        return {
            wpm,
            status: 'too_fast',
            feedback: `Whoa! Too fast for the ${range.name}! Aim for ${range.min}-${range.max} WPM. 🐢`
        };
    } else if (wpm < range.min) {
        return {
            wpm,
            status: 'too_slow',
            feedback: `A bit too sleepy for the ${range.name}! Wake up! 💤`
        };
    } else {
        return {
            wpm,
            status: 'perfect',
            feedback: `Perfect ${range.name} pace! Watch me go! 🌟`
        };
    }
}

// --- TEST SUITE ---

const testCases = [
    // Tier 1: Jungle (40-70 WPM)
    { tier: 1, wpm: 30, expected: 'too_slow', desc: 'Tier 1 - Too Slow (30)' },
    { tier: 1, wpm: 40, expected: 'perfect', desc: 'Tier 1 - Perfect Lower (40)' },
    { tier: 1, wpm: 55, expected: 'perfect', desc: 'Tier 1 - Perfect Mid (55)' },
    { tier: 1, wpm: 70, expected: 'perfect', desc: 'Tier 1 - Perfect Upper (70)' },
    { tier: 1, wpm: 71, expected: 'too_fast', desc: 'Tier 1 - Too Fast (71)' }, // Boundary
    { tier: 1, wpm: 80, expected: 'too_fast', desc: 'Tier 1 - Too Fast (80)' },

    // Tier 2: River (60-90 WPM)
    { tier: 2, wpm: 50, expected: 'too_slow', desc: 'Tier 2 - Too Slow (50)' },
    { tier: 2, wpm: 59, expected: 'too_slow', desc: 'Tier 2 - Too Slow (59)' }, // Boundary
    { tier: 2, wpm: 60, expected: 'perfect', desc: 'Tier 2 - Perfect Lower (60)' },
    { tier: 2, wpm: 75, expected: 'perfect', desc: 'Tier 2 - Perfect Mid (75)' },
    { tier: 2, wpm: 90, expected: 'perfect', desc: 'Tier 2 - Perfect Upper (90)' },
    { tier: 2, wpm: 91, expected: 'too_fast', desc: 'Tier 2 - Too Fast (91)' }, // Boundary

    // Tier 3: Mountain (80-110 WPM)
    { tier: 3, wpm: 70, expected: 'too_slow', desc: 'Tier 3 - Too Slow (70)' },
    { tier: 3, wpm: 79, expected: 'too_slow', desc: 'Tier 3 - Too Slow (79)' }, // Boundary
    { tier: 3, wpm: 80, expected: 'perfect', desc: 'Tier 3 - Perfect Lower (80)' },
    { tier: 3, wpm: 95, expected: 'perfect', desc: 'Tier 3 - Perfect Mid (95)' },
    { tier: 3, wpm: 110, expected: 'perfect', desc: 'Tier 3 - Perfect Upper (110)' },
    { tier: 3, wpm: 120, expected: 'too_fast', desc: 'Tier 3 - Too Fast (120)' },
];

console.log('🐢 Running Turtle Logic Verification (Inline)...\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ tier, wpm, expected, desc }) => {
    // Mock duration to achieve target WPM with 10 words
    const words = 10;
    // duration = words / (wpm / 60000) ?? no
    // wpm = words / minutes
    // minutes = words / wpm
    const minutes = words / wpm;
    const durationMs = minutes * 60 * 1000;

    const result = calculateSpeakingRate(words, durationMs, tier);

    if (result.status === expected) {
        console.log(`✅ [PASS] ${desc}: ${wpm} WPM -> ${result.status} (${result.feedback})`);
        passed++;
    } else {
        console.error(`❌ [FAIL] ${desc}: Expected ${expected}, got ${result.status} (${result.wpm} WPM)`);
        console.error(`   Feedback: ${result.feedback}`);
        failed++;
    }
});

console.log(`\nResults: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
