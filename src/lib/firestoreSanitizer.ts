type FirestoreSerializable =
  | string
  | number
  | boolean
  | null
  | Date
  | FirestoreSerializable[]
  | { [key: string]: FirestoreSerializable };

export const sanitizeForFirestore = (value: unknown): FirestoreSerializable | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item): item is FirestoreSerializable => item !== undefined);
  }
  if (typeof value === "object") {
    const sanitizedObject: { [key: string]: FirestoreSerializable } = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      const sanitizedEntry = sanitizeForFirestore(entry);
      if (sanitizedEntry !== undefined) sanitizedObject[key] = sanitizedEntry;
    });
    return sanitizedObject;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return null;
};

export const sanitizeObjectForFirestore = <T extends Record<string, unknown>>(value: T) =>
  sanitizeForFirestore(value) as Record<string, FirestoreSerializable>;
