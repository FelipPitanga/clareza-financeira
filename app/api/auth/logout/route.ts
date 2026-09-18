import { clarezaSessionCookie } from "@/app/auth";
export async function GET(req:Request){const res=Response.redirect(new URL("/login",req.url),303);res.headers.append("Set-Cookie",`${clarezaSessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);return res;}
