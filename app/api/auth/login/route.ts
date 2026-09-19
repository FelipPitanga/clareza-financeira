import { clarezaSessionCookie, safeReturnTo } from "@/app/auth";
import { env } from "cloudflare:workers";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const returnTo = safeReturnTo(String(form.get("return_to") || "/"));
  const secret = env.CLAREZA_APP_SECRET;

  if (!secret) {
    return new Response("CLAREZA_APP_SECRET não configurado", { status: 503 });
  }

  if (password !== secret) {
    const location = new URL(
      `/login?error=1&return_to=${encodeURIComponent(returnTo)}`,
      req.url
    ).toString();

    return new Response(null, {
      status: 303,
      headers: { Location: location },
    });
  }

  const location = new URL(returnTo, req.url).toString();
  const cookie = `${clarezaSessionCookie}=${encodeURIComponent(secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;

  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Set-Cookie": cookie,
    },
  });
}
