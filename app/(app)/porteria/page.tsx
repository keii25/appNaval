// app/(app)/porteria/page.tsx — Control de Ingreso y Consulta de Portería (Server Component)
import { createClient } from "@/lib/supabase/server";
import PorteriaClient from "@/components/porteria/PorteriaClient";
import type { Perfil } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PorteriaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil: Perfil | null = null;
  if (user) {
    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", user.id)
      .single();
    perfil = data as Perfil;
  }

  return <PorteriaClient initialPerfil={perfil} />;
}
