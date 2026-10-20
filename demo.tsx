"use client";

import * as React from "react";
import { ModeWheelNavigation } from "@/components/ui/mode-wheel-navigation";

export default function ModeWheelDemo() {
  return (
    <main className="w-full h-screen bg-[#07090E] text-white flex flex-col">
      <ModeWheelNavigation className="flex-1" />
    </main>
  );
}
