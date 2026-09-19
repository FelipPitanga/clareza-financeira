import { clarezaSessionCookie } from "@/app/auth";

export async function GET(req: Request) {
  const location = new URL("/login", req.url).toString();
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Set-Cookie": `${clarezaSessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}
