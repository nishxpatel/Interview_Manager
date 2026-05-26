import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe
} from "firebase/firestore";
import type { Interview, InterviewDraft } from "../types/interview";
import { firestore } from "./firebase";
import { sanitizeObjectForFirestore } from "./firestoreSanitizer";
import { interviewToDraft, normalizeInterview, prepareDraftForSave } from "./interviewUtils";

const localKey = (uid: string) => `interview-manager:${uid}:interviews`;
export const LOCAL_DEMO_UID = "local-demo-user";

const now = () => new Date().toISOString();

const fromStored = (raw: string | null): Interview[] => {
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Interview[]).map(normalizeInterview);
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
          return normalizeInterview({ ...data, id: item.id });
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

export const getLocalInterviews = (uid: string = LOCAL_DEMO_UID): Interview[] =>
  fromStored(window.localStorage.getItem(localKey(uid)));

export const clearLocalInterviews = (uid: string = LOCAL_DEMO_UID) => {
  window.localStorage.removeItem(localKey(uid));
  window.dispatchEvent(new CustomEvent(`interviews-updated:${uid}`, { detail: [] }));
};

export const createInterview = async (uid: string, draft: InterviewDraft) => {
  const preparedDraft = prepareDraftForSave(draft);
  if (!firestore) {
    const current = fromStored(window.localStorage.getItem(localKey(uid)));
    const interview: Interview = {
      ...preparedDraft,
      id: crypto.randomUUID(),
      createdAt: now(),
      updatedAt: now()
    };
    saveLocal(uid, [interview, ...current]);
    return interview.id;
  }

  const docRef = await addDoc(collection(firestore, "users", uid, "interviews"), {
    ...sanitizeObjectForFirestore(preparedDraft),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const moveLocalDemoInterviewsToCloud = async (uid: string) => {
  if (!firestore) throw new Error("Firebase is not configured. Cloud sync is unavailable.");

  const localInterviews = getLocalInterviews(LOCAL_DEMO_UID);
  await Promise.all(
    localInterviews.map((interview) => createInterview(uid, interviewToDraft(interview)))
  );
  clearLocalInterviews(LOCAL_DEMO_UID);
  window.localStorage.removeItem("interview-manager:demo-user");
  return localInterviews.length;
};

export const updateInterview = async (
  uid: string,
  interviewId: string,
  draft: InterviewDraft
) => {
  const preparedDraft = prepareDraftForSave(draft);
  if (!firestore) {
    const current = fromStored(window.localStorage.getItem(localKey(uid)));
    saveLocal(
      uid,
      current.map((item) =>
        item.id === interviewId
          ? normalizeInterview({ ...item, ...preparedDraft, updatedAt: now() })
          : item
      )
    );
    return;
  }

  await setDoc(
    doc(firestore, "users", uid, "interviews", interviewId),
    {
      ...sanitizeObjectForFirestore(preparedDraft),
      stage: deleteField(),
      status: deleteField(),
      followUpReminder: deleteField(),
      followUpReminderDate: deleteField(),
      reminder: deleteField(),
      updatedAt: serverTimestamp()
    },
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

export const deleteAllInterviews = async (uid: string) => {
  if (!firestore) {
    saveLocal(uid, []);
    return;
  }

  const snapshot = await getDocs(collection(firestore, "users", uid, "interviews"));
  const batch = writeBatch(firestore);
  snapshot.docs.forEach((item) => batch.delete(item.ref));
  await batch.commit();
};
