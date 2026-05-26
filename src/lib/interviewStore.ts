import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe
} from "firebase/firestore";
import type { Interview, InterviewDraft } from "../types/interview";
import { firestore } from "./firebase";

const localKey = (uid: string) => `interview-manager:${uid}:interviews`;

const now = () => new Date().toISOString();

const fromStored = (raw: string | null): Interview[] => {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Interview[];
  } catch {
    return [];
  }
};

export const watchInterviews = (
  uid: string,
  onChange: (interviews: Interview[]) => void,
  onError: (message: string) => void
): Unsubscribe => {
  if (!firestore) {
    onChange(fromStored(window.localStorage.getItem(localKey(uid))));
    const handler = (event: StorageEvent) => {
      if (event.key === localKey(uid)) onChange(fromStored(event.newValue));
    };
    const customHandler = (event: Event) => {
      onChange((event as CustomEvent<Interview[]>).detail);
    };
    window.addEventListener("storage", handler);
    window.addEventListener(`interviews-updated:${uid}`, customHandler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(`interviews-updated:${uid}`, customHandler);
    };
  }

  // User data is stored under /users/{uid}/interviews. Firestore rules in this repo
  // restrict reads and writes so authenticated users can only access their own uid.
  const interviewsRef = collection(firestore, "users", uid, "interviews");
  return onSnapshot(
    query(interviewsRef, orderBy("updatedAt", "desc")),
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => {
          const data = item.data() as Omit<Interview, "id">;
          return { ...data, id: item.id };
        })
      );
    },
    (error) => onError(error.message)
  );
};

const saveLocal = (uid: string, interviews: Interview[]) => {
  window.localStorage.setItem(localKey(uid), JSON.stringify(interviews));
  window.dispatchEvent(new CustomEvent(`interviews-updated:${uid}`, { detail: interviews }));
};

export const createInterview = async (uid: string, draft: InterviewDraft) => {
  if (!firestore) {
    const current = fromStored(window.localStorage.getItem(localKey(uid)));
    const interview: Interview = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: now(),
      updatedAt: now()
    };
    saveLocal(uid, [interview, ...current]);
    return interview.id;
  }

  const docRef = await addDoc(collection(firestore, "users", uid, "interviews"), {
    ...draft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateInterview = async (
  uid: string,
  interviewId: string,
  draft: InterviewDraft
) => {
  if (!firestore) {
    const current = fromStored(window.localStorage.getItem(localKey(uid)));
    saveLocal(
      uid,
      current.map((item) =>
        item.id === interviewId ? { ...item, ...draft, updatedAt: now() } : item
      )
    );
    return;
  }

  await setDoc(
    doc(firestore, "users", uid, "interviews", interviewId),
    { ...draft, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const deleteInterview = async (uid: string, interviewId: string) => {
  if (!firestore) {
    const current = fromStored(window.localStorage.getItem(localKey(uid)));
    saveLocal(
      uid,
      current.filter((item) => item.id !== interviewId)
    );
    return;
  }

  await deleteDoc(doc(firestore, "users", uid, "interviews", interviewId));
};
