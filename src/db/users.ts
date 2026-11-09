import { db } from "./index.ts";
import { users } from "./schema.ts";

export async function getOrCreateUser(
  uid: string,
  email: string,
  role: "user" | "admin" = "user"
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          role,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query failed in getOrCreateUser:", error);
    throw new Error("Database query failed. Please try again later.", {
      cause: error,
    });
  }
}
