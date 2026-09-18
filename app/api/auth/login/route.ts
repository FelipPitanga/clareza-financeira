import { clarezaSessionCookie, safeReturnTo } from "@/app/auth";
export async function POST(req: Request) {
 const form=await req.formData(); const password=String(form.get("password")||""); const returnTo=safeReturnTo(String(form.get("return_to")||"/")); const secret=process.env.CLAREZA_APP_SECRET;
 if(!secret)return new Response("CLAREZA_APP_SECRET não configurado",{status:503});
 if(password!==secret)return Response.redirect(new URL(`/login?error=1&return_to=${encodeURIComponent(returnTo)}`,req.url),303);
 const res=Response.redirect(new URL(returnTo,req.url),303); res.headers.append("Set-Cookie",`${clarezaSessionCookie}=${encodeURIComponent(secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`); return res;
}
