/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = Record<string, unknown>;

function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "authorization, x-client-info, apikey, content-type",
      "access-control-allow-methods": "POST, PATCH, OPTIONS",
    },
  });
}

function parseNumber(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseString(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("authorization") ?? "";
    const client = createClient(supabaseUrl, serviceKey, {
      global: { headers: { authorization: auth } },
    });

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json(415, { ok: false, error: "Expected multipart/form-data" });
    }

    const form = await req.formData();

    const sepulturaIdRaw = form.get("sepultura_id");
    const sepultura_id = parseNumber(sepulturaIdRaw);
    if (!sepultura_id) return json(400, { ok: false, error: "sepultura_id required" });

    const actor_uid = parseString(form.get("actor_uid"));
    const source = parseString(form.get("source")) ?? "app";

    const estado = parseString(form.get("estado"));
    if (estado && estado !== "libre" && estado !== "ocupada") {
      return json(400, { ok: false, error: "estado debe ser libre u ocupada" });
    }
    const notas = parseString(form.get("notas"));
    const ubicacion_texto = parseString(form.get("ubicacion_texto"));
    const lat = parseNumber(form.get("lat"));
    const lon = parseNumber(form.get("lon"));

    const updatePayload: Record<string, unknown> = {};
    if (estado) updatePayload.estado = estado;
    if (notas !== null) updatePayload.notas = notas;
    if (ubicacion_texto !== null) updatePayload.ubicacion_texto = ubicacion_texto;
    if (lat !== null) updatePayload.lat = lat;
    if (lon !== null) updatePayload.lon = lon;

    // Foto (opcional)
    let publicUrl: string | null = null;
    const foto = form.get("foto");
    const fotoDescripcion = parseString(form.get("foto_descripcion"));
    const guardarEnDocumentos = (parseString(form.get("guardar_en_documentos")) ?? "").toLowerCase() === "true";

    if (foto && foto instanceof File) {
      const ext = (foto.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const filename = `sep_${sepultura_id}_${Date.now()}.${safeExt}`;
      const path = `sepulturas/${sepultura_id}/${filename}`;

      const { error: uploadError } = await client.storage
        .from("fotos-cementerio")
        .upload(path, foto, { contentType: foto.type || "image/jpeg", upsert: false });

      if (uploadError) return json(500, { ok: false, error: uploadError.message });

      const { data: urlData } = client.storage.from("fotos-cementerio").getPublicUrl(path);
      publicUrl = urlData.publicUrl;

      // Registro fotográfico
      if (guardarEnDocumentos) {
        // `cemn_documentos` si existe
        const { error: docErr } = await client.from("cemn_documentos").insert({
          sepultura_id,
          tipo: "fotografia",
          nombre_original: foto.name || filename,
          ruta_archivo: publicUrl,
          mime_type: foto.type || "image/jpeg",
          tamano_bytes: foto.size ?? null,
          descripcion: fotoDescripcion,
        });
        // Si la tabla no existe o falla, caemos a `cemn_fotos`
        if (docErr) {
          const { error: fotoErr } = await client.from("cemn_fotos").insert({
            sepultura_id,
            url: publicUrl,
            descripcion: fotoDescripcion,
          });
          if (fotoErr) return json(500, { ok: false, error: fotoErr.message });
        }
      } else {
        const { error: fotoErr } = await client.from("cemn_fotos").insert({
          sepultura_id,
          url: publicUrl,
          descripcion: fotoDescripcion,
        });
        if (fotoErr) return json(500, { ok: false, error: fotoErr.message });
      }
    }

    // Patch sepultura
    if (Object.keys(updatePayload).length > 0) {
      const { error: upErr } = await client
        .from("cemn_sepulturas")
        .update(updatePayload)
        .eq("id", sepultura_id);

      if (upErr) return json(500, { ok: false, error: upErr.message });
    }

    // Audit event (best-effort)
    const auditPayload: Record<string, unknown> = {
      ...updatePayload,
      foto_url: publicUrl,
      foto_descripcion: fotoDescripcion,
      guardar_en_documentos: guardarEnDocumentos,
    };
    await client.from("cemn_audit_events").insert({
      sepultura_id,
      actor_uid: actor_uid ?? null,
      source,
      action: "field_audit_patch",
      payload: auditPayload,
    });

    return json(200, { ok: true, sepultura_id, foto_url: publicUrl });
  } catch (e) {
    return json(500, { ok: false, error: String(e) });
  }
});

