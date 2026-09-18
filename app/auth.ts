import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type ClarezaUser = { userId: string; displayName: string; email: string; fullName: string | null };
const COOKIE_NAME = "clareza_session";

export async function getClarezaUser(): Promise<ClarezaUser | null> {
  const store = await cookies();
  const session = store.get(COOKIE_NAME)?.value;
  const secret = process.env.CLAREZA_APP_SECRET;
  if (!secret || session !== secret) return null;
  return { userId: "felipe", displayName: "Felipe", email: "clareza@local.app", fullName: "Felipe" };
}
export async function requireClarezaUser(returnTo: string): Promise<ClarezaUser> {
  const user = await getClarezaUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`);
}
export function safeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
export const clarezaSessionCookie = COOKIE_NAME;
