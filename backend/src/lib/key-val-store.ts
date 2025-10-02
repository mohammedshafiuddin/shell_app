import { and, eq } from "drizzle-orm";
import { db } from "../db/db_index";
import { keyValueTable } from "../db/schema";

export async function getKeyVal(
  key: string,
  comment: string
): Promise<string | null>;
export async function getKeyVal(key: string): Promise<string | null>;
// Implementation
export async function getKeyVal(
  key: string,
  comment?: string
): Promise<string | null> {
  if (comment !== undefined) {
    // Implementation when both key and comment are provided
    return getKeyValWithComment(key, comment);
  } else {
    // Implementation when only key is provided
    return getKeyValSimple(key);
  }
}

export async function getKeyValWithComment(key: string, comment: string) {
  const val = await db.query.keyValueTable.findFirst({
    where: and(eq(keyValueTable.key, key), eq(keyValueTable.comment, comment)),
  });
  return val?.value || null;
}

export async function getKeyValSimple(key: string) {
  const val = await db.query.keyValueTable.findFirst({
    where: eq(keyValueTable.key, key),
  });
  return val?.value || null;
}

export async function setKeyVal(
  key: string,
  value: string,
  comment: string
): Promise<void>;
export async function setKeyVal(
  key: string,
  value: string
): Promise<void>;

export async function setKeyVal(
  key: string,
  value: string,
  comment?: string
): Promise<void> {
    
  if (comment !== undefined) {
    // Implementation when both key and comment are provided
     setKeyValWithComment(key, value, comment);
  } else {
    // Implementation when only key is provided
     setKeyValSimple(key, value);
  }
}

export async function setKeyValWithComment(
  key: string,
  value: string,
  comment: string | null
) {
  const val = await db
    .insert(keyValueTable)
    .values({
      key: key,
      comment: comment,
      value: value,
    })
    .onConflictDoUpdate({
      target: keyValueTable.key,
      set: {
        value: value,
        comment: comment,
      },
    })
    .returning({ id: keyValueTable.id });

}
export async function setKeyValSimple(key: string, value:string) {
    await setKeyValWithComment(key, value, null)
}
