import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";

export type ClarezaUser = { userId: string; displayName: string; email: string; fullName: string | null };
const COOKIE_NAME = "clareza_session";
const CLAREZA_OWNER_ID = "Dfnm8ptCdrXMvcdeU9ybQeUJ3Jgqe8IwEkdUozVGnYT0s7hJ6u6bub";

export async function getClarezaUser(): Promise<ClarezaUser | null> {
  const store = await cookies();
  const session = store.get(COOKIE_NAME)?.value;
  const secret = env.CLAREZA_APP_SECRET;
  if (!secret || session !== secret) return null;
  return {
    userId: CLAREZA_OWNER_ID,
    displayName: "Felipe",
    email: "clareza@local.app",
    fullName: "Felipe",
  };
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
