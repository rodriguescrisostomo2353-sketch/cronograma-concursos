"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Layers,
  LayoutGrid,
  Zap,
  Check
} from "lucide-react"

export interface FlashcardItem {
  id: string
  subject: string
  color?: string
  front: string
  back: string
  status?: "novo" | "dominado" | "revisar"
  tag?: string
}

export interface TiltedGridHeroProps {
  title?: string
  subtitle?: string
  flashcards?: FlashcardItem[]
  onBack?: () => void
  onGenerateAI?: () => void
  onCardStatusChange?: (cardId: string, status: "dominado" | "revisar") => void
  defaultViewMode?: "grid" | "cylinder"
  bend?: number
  className?: string
}

const DEFAULT_FLASHCARDS: FlashcardItem[] = [
  {
    id: "fc-1",
    subject: "Noções de Direito Penal",
    color: "#EF4444",
    front: "Quais são os 4 elementos da tipicidade formal segundo a teoria finalista?",
    back: "Conduta (dolosa ou culposa), Resultado naturalístico, Nexo de causalidade e Tipicidade (subsunção do fato à norma).",
    status: "novo"
  },
  {
    id: "fc-2",
    subject: "Noções de Direito Constitucional",
    color: "#3B82F6",
    front: "Mnemônico dos Fundamentos da República Federativa do Brasil (Art. 1º CF/88):",
    back: "SO-CI-DI-VA-PLU: Soberania, Cidadania, Dignidade da pessoa humana, Valores sociais do trabalho e da livre iniciativa, Pluralismo político.",
    status: "dominado"
  },
  {
    id: "fc-3",
    subject: "Direito Administrativo",
    color: "#10B981",
    front: "Quais os atributos dos atos administrativos segundo a doutrina clássica?",
    back: "Mnemônico PATI: Presunção de legitimidade/veracidade, Autoexecutoriedade, Tipicidade e Imperatividade.",
    status: "revisar"
  },
  {
    id: "fc-4",
    subject: "Língua Portuguesa",
    color: "#8B5CF6",
    front: "Casos em que o uso do acento grave indicador de crase é facultativo:",
    back: "Mnemônico NOME DE MULHER / ATÉ / PRONOME POSSESSIVO: Diante de nomes próprios femininos, após a preposição 'até' e antes de pronomes possessivos femininos no singular.",
    status: "novo"
  },
  {
    id: "fc-5",
    subject: "Legislação Penal Especial",
    color: "#D4AF37",
    front: "Lei de Drogas (Lei 11.343/06, Art. 28) - O porte de drogas para consumo pessoal foi descriminalizado?",
    back: "NÃO. Houve despenalização (extinção das penas privativas de liberdade), mas o fato continua com natureza de crime de menor potencial ofensivo.",
    status: "novo"
  }
]

export function TiltedGridHero({
  title = "FLASHCARDS TÁTICOS POR IA",
  subtitle = "Memorização Operacional Ativa",
  flashcards = DEFAULT_FLASHCARDS,
  onBack,
  onGenerateAI,
  onCardStatusChange,
  defaultViewMode = "cylinder",
  bend = 24,
  className = ""
}: TiltedGridHeroProps) {
  const [viewMode, setViewMode] = useState<"grid" | "cylinder">(defaultViewMode)
  const [activeIndex, setActiveIndex] = useState(0)
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [radius, setRadius] = useState(620)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Checagem de prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setIsReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // ResizeObserver para cálculo dinâmico do raio do cilindro (Tilted Grid Algorithm)
  useEffect(() => {
    if (!viewportRef.current) return

    const updateRadius = () => {
      const width = viewportRef.current?.offsetWidth || 800
      // R ajusta a curvatura em função da largura do container
      const computedRadius = Math.max(460, Math.min(840, Math.round(width * 0.72)))
      setRadius(computedRadius)
    }

    updateRadius()
    const observer = new ResizeObserver(updateRadius)
    observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [])

  const toggleFlip = useCallback((id: string) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const nextCard = useCallback(() => {
    if (flashcards.length === 0) return
    setActiveIndex(prev => (prev + 1) % flashcards.length)
  }, [flashcards.length])

  const prevCard = useCallback(() => {
    if (flashcards.length === 0) return
    setActiveIndex(prev => (prev - 1 + flashcards.length) % flashcards.length)
  }, [flashcards.length])

  // Suporte a teclas de seta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== "cylinder") return
      if (e.key === "ArrowLeft") prevCard()
      if (e.key === "ArrowRight") nextCard()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [viewMode, nextCard, prevCard])

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#0E131E] p-4 text-[#F3F4F6] shadow-2xl overflow-hidden ${className}`}
      style={{ perspective: "1200px" }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER TÁTICO COM BOTÃO VOLTAR E CONTROLES
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.18)] pb-3.5">
        <div className="flex items-center gap-3">
          {/* Botão Animado "Voltar ao Painel" com ArrowLeft deslizante */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Voltar para a tela anterior do Painel"
              className="group relative inline-flex items-center gap-2 rounded-lg border border-[rgba(212,175,55,0.35)] bg-[rgba(15,20,30,0.85)] px-3 py-1.5 text-xs font-bold text-[#F1E5C8] shadow-sm backdrop-blur-md transition-all duration-200 ease-out hover:border-[#D4AF37] hover:bg-[rgba(26,34,49,0.95)] hover:text-white hover:shadow-[0_0_14px_rgba(212,175,55,0.28)] active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#D4AF37] transition-transform duration-250 ease-out group-hover:-translate-x-1 group-hover:text-white" />
              <span>Voltar ao Painel</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-[#F3F4F6]">
              <Zap className="h-4 w-4 text-[#D4AF37]" />
              {title}
            </span>
            <span className="rounded-full bg-[rgba(212,175,55,0.15)] px-2 py-0.5 text-[10px] font-bold text-[#D4AF37]">
              {flashcards.length} CARDS
            </span>
          </div>
        </div>

        {/* Lado Direito: Alternador de Modo de Visualização & Ação de IA */}
        <div className="flex items-center gap-2">
          {/* Alternador Modo Grade vs Cilindro 3D */}
          <div className="inline-flex rounded-lg border border-[rgba(212,175,55,0.2)] bg-[rgba(11,14,20,0.7)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewMode === "grid"
                  ? "border border-[rgba(212,175,55,0.4)] bg-[linear-gradient(135deg,rgba(212,175,55,0.25)_0%,rgba(212,175,55,0.12)_100%)] text-[#F1E5C8] font-bold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span>Grade</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cylinder")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewMode === "cylinder"
                  ? "border border-[rgba(212,175,55,0.4)] bg-[linear-gradient(135deg,rgba(212,175,55,0.25)_0%,rgba(212,175,55,0.12)_100%)] text-[#F1E5C8] font-bold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>Cilindro 3D</span>
            </button>
          </div>

          {onGenerateAI && (
            <button
              type="button"
              onClick={onGenerateAI}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,#E5C07B_0%,#D4AF37_100%)] px-3 py-1.5 text-xs font-bold text-[#0B0E14] shadow-md transition-all hover:brightness-110 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Gerar Flashcards com IA</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PALCO DO MODO CILÍNDRICO 3D (TILTED GRID HERO)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "cylinder" ? (
        <div
          className="relative flex flex-col items-center justify-center py-6 select-none"
          style={{
            maskImage: "linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%)"
          }}
        >
          <div
            ref={viewportRef}
            className="relative h-[250px] w-full max-w-[880px] overflow-visible"
            style={{
              perspective: "1000px",
              transformStyle: "preserve-3d"
            }}
          >
            {flashcards.map((card, idx) => {
              const diff = idx - activeIndex
              const absDiff = Math.abs(diff)
              const angleDeg = diff * bend
              const isCenter = diff === 0
              const isVisible = absDiff <= 3
              const isFlipped = !!flippedCards[card.id]

              // Fórmula matemática exata: translateZ(radius) rotateY(deg) translateZ(-radius)
              const transformStyle = isReducedMotion
                ? `translate(calc(-50% + ${diff * 290}px), -50%)`
                : `translate(-50%, -50%) translateZ(${radius}px) rotateY(${angleDeg}deg) translateZ(-${radius}px) ${
                    isCenter ? "scale(1.03)" : "scale(0.96)"
                  }`

              const opacity = isCenter ? 1 : absDiff === 1 ? 0.78 : absDiff === 2 ? 0.42 : 0
              const zIndex = 20 - absDiff

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (!isCenter) {
                      setActiveIndex(idx)
                    } else {
                      toggleFlip(card.id)
                    }
                  }}
                  className={`absolute top-1/2 left-1/2 h-[225px] w-[295px] cursor-pointer transition-all duration-500 ease-out ${
                    isVisible ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                  style={{
                    transform: transformStyle,
                    opacity: opacity,
                    zIndex: zIndex,
                    transformStyle: "preserve-3d"
                  }}
                >
                  {/* Container 3D Flip do Card */}
                  <div
                    className="relative h-full w-full rounded-xl transition-transform duration-500"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                    }}
                  >
                    {/* FRENTE */}
                    <div
                      className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-xl border border-[rgba(212,175,55,0.25)] bg-[linear-gradient(145deg,#17202F_0%,#111622_100%)] p-4 shadow-xl"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        borderTop: `3px solid ${card.color || "#D4AF37"}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider"
                          style={{ backgroundColor: card.color || "#D4AF37" }}
                        >
                          {card.subject}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {card.status === "dominado" ? "✓ Dominado" : "● Novo"}
                        </span>
                      </div>

                      <div className="my-2 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
                          Conceito-Chave / Artigo
                        </span>
                        <p className="mt-1 text-[13px] font-semibold text-gray-100 line-clamp-4 leading-relaxed">
                          {card.front}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10.5px] text-gray-400">
                        <span className="flex items-center gap-1 text-[#D4AF37]">
                          <RotateCw className="h-3 w-3" /> Toque para o Bizu
                        </span>
                      </div>
                    </div>

                    {/* VERSO (BIZU ORIGINAL) */}
                    <div
                      className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-xl border border-[rgba(16,185,129,0.35)] bg-[linear-gradient(145deg,#192434_0%,#121824_100%)] p-4 shadow-xl"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        borderTop: "3px solid #10B981"
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-[#10B981] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Bizu Tático
                        </span>
                        <span className="text-[10px] text-[#10B981] font-bold">✓ Verso</span>
                      </div>

                      <div className="my-2">
                        <p className="text-[12px] leading-relaxed text-gray-200 line-clamp-5">
                          {card.back}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 border-t border-white/10 pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCardStatusChange?.(card.id, "dominado")
                          }}
                          className="flex-1 rounded border border-[#10B981]/40 bg-[#10B981]/15 py-1 text-center text-[10.5px] font-bold text-[#10B981] hover:bg-[#10B981]/25"
                        >
                          ✓ Dominado
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCardStatusChange?.(card.id, "revisar")
                          }}
                          className="flex-1 rounded border-[#F59E0B]/40 bg-[#F59E0B]/15 py-1 text-center text-[10.5px] font-bold text-[#F59E0B] hover:bg-[#F59E0B]/25"
                        >
                          ↻ Revisar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Controles de Navegação do Cilindro */}
          <div className="mt-4 flex items-center gap-4 z-10">
            <button
              type="button"
              onClick={prevCard}
              title="Card Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(15,20,30,0.85)] text-[#D4AF37] shadow-lg transition-all hover:scale-110 hover:border-[#D4AF37] hover:bg-[rgba(26,34,49,0.95)] hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {flashcards.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "w-5 bg-[#D4AF37]" : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextCard}
              title="Próximo Card"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(15,20,30,0.85)] text-[#D4AF37] shadow-lg transition-all hover:scale-110 hover:border-[#D4AF37] hover:bg-[rgba(26,34,49,0.95)] hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            3. PALCO DO MODO GRADE TRADICIONAL
            ───────────────────────────────────────────────────────────── */
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map(card => {
            const isFlipped = !!flippedCards[card.id]
            return (
              <div
                key={card.id}
                onClick={() => toggleFlip(card.id)}
                className="relative h-[210px] w-full cursor-pointer"
                style={{ perspective: "1000px" }}
              >
                <div
                  className="relative h-full w-full rounded-xl transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                  }}
                >
                  {/* FRENTE */}
                  <div
                    className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-xl border border-[rgba(212,175,55,0.25)] bg-[linear-gradient(145deg,#17202F_0%,#111622_100%)] p-4 shadow-lg"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      borderTop: `3px solid ${card.color || "#D4AF37"}`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: card.color || "#D4AF37" }}
                      >
                        {card.subject}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400">
                        {card.status === "dominado" ? "✓ Dominado" : "● Novo"}
                      </span>
                    </div>

                    <p className="my-1 text-[12.5px] font-semibold text-gray-100 line-clamp-4 leading-relaxed">
                      {card.front}
                    </p>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1 text-[#D4AF37]">
                        <RotateCw className="h-3 w-3" /> Toque para ver o Bizu
                      </span>
                    </div>
                  </div>

                  {/* VERSO */}
                  <div
                    className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-xl border border-[rgba(16,185,129,0.35)] bg-[linear-gradient(145deg,#192434_0%,#121824_100%)] p-4 shadow-lg"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderTop: "3px solid #10B981"
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-[#10B981] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Bizu Tático
                      </span>
                      <span className="text-[10px] text-[#10B981] font-bold">✓ Verso</span>
                    </div>

                    <p className="my-1 text-[11.5px] leading-relaxed text-gray-200 line-clamp-5">
                      {card.back}
                    </p>

                    <div className="flex items-center gap-2 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCardStatusChange?.(card.id, "dominado")
                        }}
                        className="flex-1 rounded border border-[#10B981]/40 bg-[#10B981]/15 py-1 text-center text-[10px] font-bold text-[#10B981] hover:bg-[#10B981]/25"
                      >
                        ✓ Dominado
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCardStatusChange?.(card.id, "revisar")
                        }}
                        className="flex-1 rounded border-[#F59E0B]/40 bg-[#F59E0B]/15 py-1 text-center text-[10px] font-bold text-[#F59E0B] hover:bg-[#F59E0B]/25"
                      >
                        ↻ Revisar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
