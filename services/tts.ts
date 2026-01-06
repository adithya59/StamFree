import * as Speech from 'expo-speech';

export type TtsType = 'prompt' | 'feedback';

const DEFAULTS: Record<TtsType, { rate: number; pitch: number; language?: string }> = {
  // Prompts are slower and clearer to help children understand
  prompt: { rate: 0.75, pitch: 1.0, language: 'en-US' },
  // Feedback can be a bit faster / natural
  feedback: { rate: 1.0, pitch: 1.0, language: 'en-US' },
};

let _preferredVoiceId: string | null = null;
let _preferredLocale: string | null = null;
let _voiceInitInProgress = false;

export function stop() {
  try {
    Speech.stop();
  } catch (e) {
    // ignore
  }
}

/**
 * Best-effort selection of a clear English voice.
 * This attempts to pick a voice that matches the requested locale (if provided)
 * and prefers well-known clear voice names when available.
 */
async function selectPreferredVoice(locale?: string) {
  if (_preferredVoiceId || _voiceInitInProgress) return;
  _voiceInitInProgress = true;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return;

    // Filter to voices that match locale preference, otherwise English voices
    const normalize = (s?: string) => (s || '').toLowerCase();
    const localeLower = normalize(locale ?? _preferredLocale ?? 'en');

    let candidates = voices.filter(v => {
      const lang = normalize((v as any).language);
      return lang.startsWith(localeLower);
    });

    if (candidates.length === 0) {
      candidates = voices.filter(v => normalize((v as any).language).startsWith('en'));
    }

    // Scoring heuristics for clarity / neutrality
    const score = (v: any) => {
      const name = normalize(v.name);
      const id = normalize(v.identifier || v.voice || '');
      let s = 0;
      if (name.includes('samantha') || name.includes('olivia') || name.includes('ava')) s += 5;
      if (name.includes('alloy') || name.includes('google') || name.includes('wavenet')) s += 4;
      if (id.includes('samantha') || id.includes('wavenet')) s += 3;
      if (name.includes('female') || id.includes('female') || name.includes('f')) s += 1;
      // prefer exact locale match
      if (normalize(v.language).startsWith(localeLower)) s += 2;
      return s;
    };

    candidates.sort((a: any, b: any) => score(b) - score(a));

    const chosen = candidates[0] || voices[0];
    // Use identifier if available, otherwise use voice or name
    _preferredVoiceId = (chosen.identifier || chosen.voice || chosen.name) as string || null;
  } catch (e) {
    // ignore
  } finally {
    _voiceInitInProgress = false;
  }
}

export async function listVoices() {
  try {
    return await Speech.getAvailableVoicesAsync();
  } catch (e) {
    return [] as any[];
  }
}

export function setPreferredVoiceId(id: string | null) {
  _preferredVoiceId = id;
}

export function setPreferredLocale(locale: string | null) {
  _preferredLocale = locale;
  // try to refresh preferred voice to match locale
  void selectPreferredVoice(locale ?? undefined);
}

export function speak(text: string, opts?: { type?: TtsType; rate?: number; pitch?: number; language?: string; voice?: string }) {
  if (!text) return;
  const type = opts?.type ?? 'prompt';
  const base = DEFAULTS[type];
  const options = {
    rate: typeof opts?.rate === 'number' ? opts.rate : base.rate,
    pitch: typeof opts?.pitch === 'number' ? opts.pitch : base.pitch,
    language: opts?.language ?? base.language,
  } as any;

  // If caller provided a voice, use it. Otherwise use preferred voice if available.
  if (opts?.voice) {
    options.voice = opts.voice;
  } else if (_preferredVoiceId) {
    options.voice = _preferredVoiceId;
  } else {
    void selectPreferredVoice(opts?.language);
  }

  try {
    Speech.stop();
    Speech.speak(String(text), options);
  } catch (e) {
    // swallow TTS errors - not critical
  }
}
