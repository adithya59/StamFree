const AI_URL = "https://your-backend-url/analyze";

export async function analyzeSpeech(audioUri: string) {
  const formData = new FormData();

  formData.append("audio", {
    uri: audioUri,
    name: "speech.wav",
    type: "audio/wav",
  } as any);

  const response = await fetch(AI_URL, {
    method: "POST",
    body: formData,
  });

  return response.json();
}
9