// app/api/admin/marca/upload/route.ts — Subida de archivos multimedia al bucket 'marca'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MIME_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Verificar rol admin
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfil?.rol !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol de administrador." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tipo = (formData.get("tipo") as string) || "asset";

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo permitido de 2 MB." },
        { status: 400 }
      );
    }

    if (!MIME_PERMITIDOS.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Formato de imagen no permitido (${file.type}). Use PNG, JPEG, WebP, SVG o ICO.`,
        },
        { status: 400 }
      );
    }

    // Determinar extensión
    const nombreOriginal = file.name || "imagen.png";
    const partes = nombreOriginal.split(".");
    const ext = partes.length > 1 ? partes.pop()?.toLowerCase() : "png";
    const path = `${tipo}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminSupabase = createAdminClient();
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from("marca")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error subiendo a bucket 'marca':", uploadError);
      return NextResponse.json(
        { error: `Error al almacenar la imagen: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from("marca").getPublicUrl(uploadData.path);

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: uploadData.path,
      mensaje: "Imagen subida exitosamente.",
    });
  } catch (err) {
    console.error("Error en POST /api/admin/marca/upload:", err);
    return NextResponse.json(
      { error: "Error inesperado al procesar la subida." },
      { status: 500 }
    );
  }
}
