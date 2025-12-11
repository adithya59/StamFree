import { storage } from '@/config/firebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export async function uploadAudio({
  uri,
  uid,
  phonemeId,
}: {
  uri: string;
  uid: string;
  phonemeId: string;
}) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const timestamp = Date.now();
  const storagePath = `audio_recordings/${uid}/${timestamp}-${phonemeId}.m4a`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: 'audio/m4a',
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl, storagePath };
}
