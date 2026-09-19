import { getClarezaUser } from "@/app/auth";

const BUCKET = "clareza-receipts";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase Storage não configurado");
  return { url: url.replace(/\/$/, ""), secret };
}

export async function POST(req: Request) {
  const user = await getClarezaUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  try {
    const file = (await req.formData()).get("file") as File;
    if (
      !file ||
      file.size > 5 * 1024 * 1024 ||
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      return Response.json({ error: "Envie PDF ou imagem de até 5 MB." }, { status: 400 });
    }

    const { url, secret } = supabaseConfig();
    const id = crypto.randomUUID();
    const path = `${user.userId}/${id}`;

    const upload = await fetch(
      `${url}/storage/v1/object/${BUCKET}/${encodeURIComponent(user.userId)}/${encodeURIComponent(id)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          apikey: secret,
          "Content-Type": file.type,
          "x-upsert": "false",
        },
        body: await file.arrayBuffer(),
      }
    );

    if (!upload.ok) {
      console.error("Supabase upload failed:", upload.status, await upload.text());
      return Response.json({ error: "Não foi possível enviar o comprovante." }, { status: 503 });
    }

    return Response.json({ id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível enviar o comprovante." }, { status: 503 });
  }
}

export async function GET(req: Request) {
  const user = await getClarezaUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[-a-z0-9]+$/.test(id)) return new Response("Inválido", { status: 400 });

  try {
    const { url, secret } = supabaseConfig();

    const download = await fetch(
      `${url}/storage/v1/object/authenticated/${BUCKET}/${encodeURIComponent(user.userId)}/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          apikey: secret,
        },
      }
    );

    if (download.status === 404) return new Response("Não encontrado", { status: 404 });
    if (!download.ok) {
      console.error("Supabase download failed:", download.status, await download.text());
      return new Response("Não foi possível abrir o comprovante.", { status: 503 });
    }

    return new Response(download.body, {
      headers: {
        "Content-Type": download.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": "attachment",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Não foi possível abrir o comprovante.", { status: 503 });
  }
}
