"use client";

// app/design-system/page.tsx — Página de Demostración del Sistema de Diseño (Apple HIG)
import React, { useState } from "react";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import LargeTitleHeader from "@/components/layout/LargeTitleHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Switch from "@/components/ui/Switch";
import Card from "@/components/ui/Card";
import InsetGroupedList, { InsetGroupedCell } from "@/components/ui/InsetGroupedList";
import Modal from "@/components/ui/Modal";
import ActionSheet from "@/components/ui/ActionSheet";
import Skeleton, { SkeletonList } from "@/components/ui/Skeleton";
import ToastProvider, { useToast } from "@/components/ui/Toast";
import {
  Users,
  Shield,
  Car,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Heart,
  Sliders,
} from "lucide-react";

function DesignSystemContent() {
  const toast = useToast();

  // Estados interactivos para pruebas
  const [parentesco, setParentesco] = useState<"Familiar" | "Amigo">("Familiar");
  const [tieneVehiculo, setTieneVehiculo] = useState<"Sí" | "No">("No");
  const [switchNotif, setSwitchNotif] = useState(true);
  const [switchAuditoria, setSwitchAuditoria] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState("Carlos Rodríguez");
  const [textoError, setTextoError] = useState("ABC12");
  const [cargandoBoton, setCargandoBoton] = useState(false);

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actionSheetAbierto, setActionSheetAbierto] = useState(false);
  const [mostrarSkeleton, setMostrarSkeleton] = useState(false);

  const toggleLoading = () => {
    setCargandoBoton(true);
    setTimeout(() => setCargandoBoton(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Encabezado Large Title con scroll dinámico */}
      <LargeTitleHeader
        title="Sistema de Diseño"
        subtitle="Biblioteca de componentes interactivos construida bajo Apple Human Interface Guidelines."
        action={
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setModalAbierto(true)}
          >
            Abrir Hoja Modal
          </Button>
        }
      />

      {/* ─── SECCIÓN 1: SELECTOR SEGMENTADO (Segmented Control) ─── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
          1. Selectores Segmentados (Segmented Controls)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Parentesco del Visitante" subtitle="Alternancia fluida entre tipos de relación">
            <SegmentedControl
              options={[
                { value: "Familiar", label: "Familiar", icon: <Heart className="w-4 h-4 text-rose-500" /> },
                { value: "Amigo", label: "Amigo", icon: <User className="w-4 h-4 text-blue-500" /> },
              ]}
              value={parentesco}
              onChange={setParentesco}
            />
            <p className="text-xs text-neutral-400 mt-3 text-center">
              Seleccionado: <strong className="text-neutral-800 dark:text-neutral-200">{parentesco}</strong>
            </p>
          </Card>

          <Card title="Ingreso con Vehículo" subtitle="Control Sí/No para desplegar campos de placa y modelo">
            <SegmentedControl
              options={[
                { value: "No", label: "Sin Vehículo (A pie)" },
                { value: "Sí", label: "Con Vehículo (Carro / Moto)", icon: <Car className="w-4 h-4 text-amber-500" /> },
              ]}
              value={tieneVehiculo}
              onChange={setTieneVehiculo}
            />
            <p className="text-xs text-neutral-400 mt-3 text-center">
              Seleccionado: <strong className="text-neutral-800 dark:text-neutral-200">{tieneVehiculo}</strong>
            </p>
          </Card>
        </div>
      </section>

      {/* ─── SECCIÓN 2: BOTONES APPLE HIG ──────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
          2. Botones y Retroalimentación Táctil
        </h2>
        <Card title="Jerarquía de Botones" subtitle="Áreas táctiles mínimas de 44px con retroalimentación active:scale">
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button variant="primary" icon={<Sparkles className="w-4 h-4" />}>
              Primario Relleno
            </Button>

            <Button variant="secondary">
              Secundario Tintado
            </Button>

            <Button
              variant="destructive"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setActionSheetAbierto(true)}
            >
              Destructivo
            </Button>

            <Button variant="tinted" icon={<Shield className="w-4 h-4" />}>
              Acento Azul
            </Button>

            <Button variant="plain">
              Texto Plano
            </Button>

            <Button
              variant="primary"
              loading={cargandoBoton}
              onClick={toggleLoading}
            >
              {cargandoBoton ? "Guardando..." : "Probar Carga (2s)"}
            </Button>

            <Button variant="primary" disabled>
              Deshabilitado
            </Button>
          </div>
        </Card>
      </section>

      {/* ─── SECCIÓN 3: CAMPOS DE FORMULARIO E INPUTS ────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
          3. Entradas de Texto y Formularios Inset
        </h2>
        <Card title="Inputs con Iconos y Limpieza" subtitle="Diseño redondeado 2xl con focus ring suave">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Búsqueda de Visitantes"
              placeholder="Buscar por cédula o nombre..."
              leftIcon={<Search className="w-4 h-4" />}
              value={textoBusqueda}
              onChange={(e) => setTextoBusqueda(e.target.value)}
              clearable
              onClear={() => setTextoBusqueda("")}
              helperText="Escribe para filtrar en tiempo real"
            />

            <Input
              label="Placa de Vehículo"
              placeholder="Ej. ABC123"
              leftIcon={<Car className="w-4 h-4" />}
              value={textoError}
              onChange={(e) => setTextoError(e.target.value)}
              error="Formato incompleto: debe tener 3 letras y 3 números (ej. ABC123 o ABC12D)"
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Ingresa tu clave"
              defaultValue="10234567"
              helperText="Incluye botón para alternar visibilidad con icono SF Symbols"
            />

            <Input
              label="Fecha de Ingreso"
              type="date"
              defaultValue="2026-10-20"
              leftIcon={<Calendar className="w-4 h-4" />}
              helperText="Selector de fecha nativo accesible"
            />
          </div>
        </Card>
      </section>

      {/* ─── SECCIÓN 4: INTERRUPTORES (iOS Switches) ─────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
          4. Interruptores estilo iOS (51x31 px)
        </h2>
        <Card title="Controles de Estado" subtitle="Pomo circular de 27px con traslación fluida y color verde #34C759">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <Switch
              label="Notificaciones de Registro"
              description="Avisar cuando un visitante registrado sea aprobado por la guardia"
              checked={switchNotif}
              onChange={setSwitchNotif}
            />
            <Switch
              label="Registro de Auditoría Detallada"
              description="Registrar IP, hora y dispositivo en cada consulta de portería"
              checked={switchAuditoria}
              onChange={setSwitchAuditoria}
            />
            <Switch
              label="Bloqueo Automático por Inactividad"
              description="Habilitado permanentemente para este entorno naval (solo lectura)"
              checked={true}
              disabled={true}
              onChange={() => {}}
            />
          </div>
        </Card>
      </section>

      {/* ─── SECCIÓN 5: LISTAS AGRUPADAS (Inset Grouped Lists) ───────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
          5. Listas Agrupadas Estilo Apple (Inset Grouped)
        </h2>
        <InsetGroupedList
          header="Visitantes de Ejemplo"
          footer="Las listas Inset Grouped utilizan esquinas de 24px, divisores sutiles y área táctil extendida."
        >
          <InsetGroupedCell
            title="María José Rodríguez"
            subtitle="C.C. 1.045.890.123 — Familiar (Hermana)"
            icon={<Heart className="w-4 h-4" />}
            iconColor="bg-rose-500 text-white"
            value={<span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Aprobado</span>}
            onClick={() => toast.info("Detalle", "Abriendo ficha de María José Rodríguez")}
          />
          <InsetGroupedCell
            title="Andrés Felipe Castro"
            subtitle="C.C. 72.345.678 — Amigo • Vehículo ABC-123"
            icon={<Car className="w-4 h-4" />}
            iconColor="bg-blue-600 text-white"
            value={<span className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">Pendiente</span>}
            onClick={() => toast.info("Detalle", "Abriendo ficha de Andrés Felipe Castro")}
          />
          <InsetGroupedCell
            title="Registrar Nuevo Visitante"
            subtitle="Cupos restantes: 3 de 5"
            icon={<Plus className="w-4 h-4" />}
            iconColor="bg-[#0A2540] text-white"
            onClick={() => setModalAbierto(true)}
          />
        </InsetGroupedList>
      </section>

      {/* ─── SECCIÓN 6: MODALES, ACTION SHEETS Y TOASTS ──────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
          6. Diálogos, Action Sheets y Notificaciones Cápsula
        </h2>
        <Card title="Pruebas de Interacción Dinámica" subtitle="Comportamiento adaptable según el tamaño de la pantalla">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              icon={<Sliders className="w-4 h-4" />}
              onClick={() => setModalAbierto(true)}
            >
              Abrir Bottom Sheet / Modal
            </Button>

            <Button
              variant="destructive"
              icon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => setActionSheetAbierto(true)}
            >
              Lanzar Action Sheet iOS
            </Button>

            <Button
              variant="secondary"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              onClick={() => toast.success("Visitante Acreditado", "El ingreso ha sido validado satisfactoriamente")}
            >
              Toast Éxito
            </Button>

            <Button
              variant="secondary"
              icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
              onClick={() => toast.error("Documento Duplicado", "Ya registraste a una persona con esa cédula")}
            >
              Toast Error
            </Button>

            <Button
              variant="secondary"
              onClick={() => setMostrarSkeleton(!mostrarSkeleton)}
            >
              {mostrarSkeleton ? "Ocultar Skeletons" : "Ver Skeletons de Carga"}
            </Button>
          </div>

          {mostrarSkeleton && (
            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Efecto Shimmer de Carga (Skeletons)
              </p>
              <SkeletonList count={3} />
            </div>
          )}
        </Card>
      </section>

      {/* ─── COMPONENTE HOJA MODAL (Bottom Sheet en móvil, Modal centrado en desktop) ─── */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Inscribir Visitante"
        description="Completa los datos del familiar o amigo que te acompañará."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setModalAbierto(false);
            toast.success("Visitante Guardado", "El registro se almacenó correctamente.");
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 ml-1">
              Parentesco
            </label>
            <SegmentedControl
              options={[
                { value: "Familiar", label: "Familiar" },
                { value: "Amigo", label: "Amigo" },
              ]}
              value={parentesco}
              onChange={setParentesco}
            />
          </div>

          <Input label="Nombre Completo" placeholder="Ej. Andrea Gómez" required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Número de Cédula" placeholder="Ej. 1098765432" required />
            <Input label="Fecha Desde" type="date" defaultValue="2026-10-20" required />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button type="submit" variant="primary" fullWidth>
              Guardar Visitante
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setModalAbierto(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── COMPONENTE ACTION SHEET (Acción Destructiva iOS) ───────── */}
      <ActionSheet
        isOpen={actionSheetAbierto}
        onClose={() => setActionSheetAbierto(false)}
        title="¿Eliminar a este visitante?"
        message="Esta acción no se puede deshacer y liberará un cupo de tu límite permitido."
        actions={[
          {
            label: "Eliminar Visitante Definitivamente",
            destructive: true,
            onClick: () => toast.error("Visitante Eliminado", "Se removió a la persona del listado."),
          },
        ]}
      />
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ToastProvider>
      <AdaptiveLayout
        userName="Cadete Ramírez"
        userSubtitle="Escuela Naval de Cadetes"
        userRole="auxiliar"
      >
        <DesignSystemContent />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
