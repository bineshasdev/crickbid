import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export async function uploadImage(
  path: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export function playerImagePath(tournamentId: string, fileName: string) {
  return `tournaments/${tournamentId}/players/${Date.now()}-${fileName}`;
}

export function clubLogoPath(tournamentId: string, fileName: string) {
  return `tournaments/${tournamentId}/clubs/${Date.now()}-${fileName}`;
}
