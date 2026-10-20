"use client";

import * as React from "react";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";

export const TACTICAL_MODES: WorksWheelItem[] = [
  {
    title: "Student OS • Operacional",
    image: "assets/student_os_banner.jpg",
    href: "student_os.html",
  },
  {
    title: "Modo Clássico • Edital",
    image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
    href: "concurso_tatico.html",
  },
  {
    title: "Tela de Início • Portal Tático",
    image: "assets/sculpture_dark.webp",
    href: "landing.html",
  },
];

export interface ModeWheelNavigationProps {
  onSelectMode?: (href: string) => void;
  className?: string;
}

export function ModeWheelNavigation({
  onSelectMode,
  className,
}: ModeWheelNavigationProps) {
  return (
    <div className={`relative w-full h-full min-h-[520px] bg-[#07090E] text-white overflow-hidden ${className || ""}`}>
      {/* Tactical Glow Header */}
      <div className="absolute top-6 left-8 z-20 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase">
            Sistema Tático • 3D Works Wheel
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white/90">
          Navegação entre Modos
        </h2>
        <p className="text-xs text-white/50 max-w-sm mt-0.5">
          Gire a roda com o scroll do mouse ou arraste verticalmente para selecionar o ambiente operacional.
        </p>
      </div>

      {/* 3D Wheel Component */}
      <WorksWheel
        items={TACTICAL_MODES}
        label="Modos '26"
        action="Acessar Modo"
        className="h-full w-full"
      />
    </div>
  );
}

export default ModeWheelNavigation;
