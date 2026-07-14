"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { copy, segnaleCopy } from "./copy";
import { Nav, Ctas, GrainOverlay } from "./chrome";
import { Receipt, Review, Flyer, SocialPost, NoteFragment, Polaroid } from "./fragments";
import { PANELS } from "./panels";
import { PlanStack } from "./plan";
import { SignalThread, type SignalThreadHandle } from "./SignalThread";
import { OpticalAperture, type OpticalApertureHandle } from "./OpticalAperture";
import {
  DESKTOP,
  MOBILE,
  DESKTOP_SEGNALE,
  INTERMEDIATE_SEGNALE,
  MOBILE_SEGNALE,
  type FragKey,
  type FragMotion,
  type LiveConfig,
} from "./live.config";
import type { CreativeTheme } from "../theme";

const FRAGMENTS = {
  receipt: Receipt,
  review: Review,
  flyer: Flyer,
  social: SocialPost,
  note: NoteFragment,
  polaroid: Polaroid,
} as const;

// selezione per tema: stessi slot e stessa timeline, cambiano i contenuti
// degli slot (frammenti cartacei vs pannelli informativi) e i parametri motion
const SLOT_VISUALS: Record<CreativeTheme, Record<FragKey, () => React.JSX.Element>> = {
  carta: FRAGMENTS,
  segnale: PANELS,
};

const CONFIGS: Record<
  CreativeTheme,
  { desktop: LiveConfig; mobile: LiveConfig; intermediate?: LiveConfig }
> = {
  carta: { desktop: DESKTOP, mobile: MOBILE },
  segnale: {
    desktop: DESKTOP_SEGNALE,
    intermediate: INTERMEDIATE_SEGNALE,
    mobile: MOBILE_SEGNALE,
  },
};

interface DebugDot {
  key: string;
  x: number;
  y: number;
}

// theme: fase preliminare Direzione B — la prop seleziona (in futuro) config e
// contenuti degli slot; oggi esiste solo "carta" e il rendering non ne dipende.
export function HeroLive({
  debug = false,
  theme = "carta",
}: {
  debug?: boolean;
  theme?: CreativeTheme;
}) {
  const heroCopy = theme === "segnale" ? segnaleCopy : copy;
  const stageRef = useRef<HTMLElement>(null);
  const hudProgressRef = useRef<HTMLSpanElement>(null);
  const hudSceneRef = useRef<HTMLSpanElement>(null);
  const hudViewportRef = useRef<HTMLSpanElement>(null);
  const svhProbeRef = useRef<HTMLDivElement>(null);
  const dvhProbeRef = useRef<HTMLDivElement>(null);
  // Signal Thread + Optical Aperture (solo tema B): layer passivi pilotati
  // dal progress esistente
  const threadRef = useRef<SignalThreadHandle>(null);
  const apertureRef = useRef<OpticalApertureHandle>(null);
  const [debugDots, setDebugDots] = useState<DebugDot[]>([]);
  const [panelBox, setPanelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const handlePrimaryClick: React.MouseEventHandler<HTMLAnchorElement> | undefined =
    theme === "segnale"
      ? (event) => {
          event.preventDefault();
          const section = document.querySelector<HTMLElement>("#section-04-cta-finale");
          const firstField = document.querySelector<HTMLInputElement>("#early-access-email");
          if (!section) return;

          window.history.pushState(null, "", "#section-04-cta-finale");
          section.scrollIntoView({
            block: "start",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          });
          window.requestAnimationFrame(() => firstField?.focus({ preventScroll: true }));
        }
      : undefined;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const stage = stageRef.current;
    if (!stage) return;

    const progress = { value: 0, driftFrozen: false };

    const updateHudViewport = () => {
      if (!hudViewportRef.current) return;
      const svh = svhProbeRef.current?.offsetHeight ?? 0;
      const dvh = dvhProbeRef.current?.offsetHeight ?? 0;
      hudViewportRef.current.textContent = `${window.innerWidth}x${window.innerHeight}px · 100svh=${svh}px · 100dvh=${dvh}px`;
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 768px)",
          isIntermediate: "(min-width: 768px) and (max-width: 1439px)",
          isMobile: "(max-width: 767px)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (mmCtx) => {
          const { isMobile, isIntermediate, reduced } = mmCtx.conditions as {
            isDesktop: boolean;
            isIntermediate: boolean;
            isMobile: boolean;
            reduced: boolean;
          };
          const themeConfigs = CONFIGS[theme];
          const cfg: LiveConfig = isMobile
            ? themeConfigs.mobile
            : isIntermediate && themeConfigs.intermediate
              ? themeConfigs.intermediate
              : themeConfigs.desktop;

          const slotOf = (f: FragMotion) =>
            stage.querySelector<HTMLElement>(`[data-frag="${f.key}"]`)!;
          const field = stage.querySelector<HTMLElement>(".fragment-field")!;
          const panel = stage.querySelector<HTMLElement>(".glass-panel--live")!;

          // Centri in coordinate canvas dai box di layout (offset*, mai getBoundingClientRect:
          // i transform dello scrub non devono inquinare i calcoli). Rivalutati a ogni refresh.
          const panelCenter = () => ({
            x: panel.offsetLeft + panel.offsetWidth / 2,
            y: panel.offsetTop + panel.offsetHeight / 2,
          });
          const slotCenter = (slot: HTMLElement) => {
            const inField = slot.offsetParent === field;
            return {
              x: (inField ? field.offsetLeft : 0) + slot.offsetLeft + slot.offsetWidth / 2,
              y: (inField ? field.offsetTop : 0) + slot.offsetTop + slot.offsetHeight / 2,
            };
          };
          const fill = stage.querySelector<HTMLElement>(".glass-panel-fill")!;
          const reflect = stage.querySelector<HTMLElement>(".glass-panel-reflect")!;
          const cards = gsap.utils.toArray<HTMLElement>(stage.querySelectorAll(".plan-card"));
          const planCaption = stage.querySelector<HTMLElement>(".plan-caption")!;
          const criticalRow = stage.querySelector<HTMLElement>(".sig-data-row--critical");
          const criticalContext = gsap.utils.toArray<HTMLElement>(
            stage.querySelectorAll('[data-frag="receipt"] .sig-data-row:not(.sig-data-row--critical)')
          );
          const headline = stage.querySelector<HTMLElement>(".headline")!;
          const lead = stage.querySelector<HTMLElement>(".lead")!;
          const ctaPrimary = stage.querySelector<HTMLElement>(".cta-primary")!;
          const ctaSecondary = stage.querySelector<HTMLElement>(".cta-secondary")!;
          const ctaArrow = stage.querySelector<HTMLElement>(".cta-arrow")!;
          const slots = cfg.frags.map(slotOf);
          const floatLayers = cfg.frags.map((f) => ({
            element: stage.querySelector<HTMLElement>(`[data-fragment-float="${f.key}"]`)!,
            motion: cfg.idle[f.key]!,
          }));

          // ------- reduced motion: stato finale statico, nessun pin, nessuno scrub -------
          if (reduced) {
            cfg.frags.forEach((f) => {
              gsap.set(slotOf(f), {
                x: f.dx,
                y: f.dy,
                scale: f.scale,
                rotation: f.rot,
                opacity: Math.max(f.opacity, 0.35),
                filter: f.blur > 0 ? "blur(2px)" : "none",
              });
            });
            gsap.set(cards, { opacity: 1, y: 0, rotationX: 0, scale: 1, "--card-sh": 1 });
            gsap.set(panel, { scaleY: 1 });
            gsap.set(fill, { opacity: 1 });
            gsap.set(reflect, { opacity: 1 });
            gsap.set(ctaPrimary, { filter: "contrast(1)", scale: 1, "--cta-sh": 1 });
            return;
          }

          // ------- stati iniziali -------
          cfg.frags.forEach((f) => {
            gsap.set(slotOf(f), { rotation: f.rot0, filter: "blur(0px)", opacity: 1, scale: 1 });
          });
          if (cfg.panelIntro) {
            gsap.set(panel, {
              transformPerspective: cfg.panelIntro.perspective,
              transformOrigin: cfg.panelIntro.origin,
              rotationY: cfg.panelIntro.rotationYFrom,
              scale: cfg.panelIntro.scaleFrom,
            });
          }
          if (cfg.panelScaleY !== undefined) {
            gsap.set(panel, { transformOrigin: "50% 100%" });
          }
          gsap.set(fill, { opacity: cfg.fillFrom });
          gsap.set(reflect, { opacity: 0 });
          gsap.set(cards, {
            opacity: 0,
            y: cfg.cardY,
            rotationX: cfg.cardRotX,
            scale: cfg.cardScale ?? 1,
            transformPerspective: 800,
            transformOrigin: "50% 100%",
            "--card-sh": 0,
          });
          gsap.set(ctaPrimary, {
            filter: cfg.finalPayoff
              ? `contrast(${cfg.finalPayoff.ctaContrastFrom})`
              : "saturate(0.92)",
            scale: 1,
            "--cta-sh": 0,
          });
          gsap.set(planCaption, { opacity: 0.08 });

          // ------- idle motion: layer interno, separato dai transform scroll -------
          const cleanups: Array<() => void> = [];
          const idleState: {
            tweens: gsap.core.Tween[];
            restartTimer: ReturnType<typeof setTimeout> | null;
            heroVisible: boolean;
          } = {
            tweens: [],
            restartTimer: null,
            heroVisible: true,
          };
          const floatElements = floatLayers.map(({ element }) => element);
          const clearIdleRestart = () => {
            if (idleState.restartTimer) {
              clearTimeout(idleState.restartTimer);
              idleState.restartTimer = null;
            }
          };
          const stopIdle = (settle: boolean) => {
            clearIdleRestart();
            idleState.tweens.forEach((tween) => tween.kill());
            idleState.tweens = [];
            gsap.killTweensOf(floatElements);
            if (settle) {
              gsap.to(floatElements, {
                x: 0,
                y: 0,
                rotation: 0,
                duration: isMobile ? 0.2 : 0.22,
                ease: "power2.out",
                overwrite: true,
              });
            } else {
              gsap.set(floatElements, { x: 0, y: 0, rotation: 0 });
            }
          };
          const startIdle = () => {
            if (!idleState.heroVisible || progress.value > 0.001 || idleState.tweens.length) return;
            gsap.killTweensOf(floatElements);
            idleState.tweens = floatLayers.map(({ element, motion }) =>
              gsap.to(element, {
                x: motion.x,
                y: motion.y,
                rotation: motion.rotation,
                duration: motion.duration,
                delay: motion.delay,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
              })
            );
          };
          const scheduleIdleRestart = () => {
            clearIdleRestart();
            if (!idleState.heroVisible || progress.value > 0.001) return;
            idleState.restartTimer = setTimeout(() => {
              idleState.restartTimer = null;
              startIdle();
            }, 320);
          };

          const idleIo = new IntersectionObserver(
            ([entry]) => {
              idleState.heroVisible = entry.isIntersecting;
              if (!entry.isIntersecting) {
                stopIdle(false);
              } else if (progress.value <= 0.001) {
                scheduleIdleRestart();
              }
            },
            { threshold: 0.05 }
          );
          idleIo.observe(stage);
          if (window.scrollY <= 1) startIdle();
          cleanups.push(() => {
            idleIo.disconnect();
            clearIdleRestart();
            idleState.tweens.forEach((tween) => tween.kill());
            gsap.killTweensOf(floatElements);
          });

          // ------- pointer parallax (solo desktop, scena 1) -------
          const drifts = gsap.utils.toArray<HTMLElement>(stage.querySelectorAll(".drift"));
          const zeroDrifts = () =>
            drifts.forEach((d) => gsap.to(d, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "power2.out" }));

          const driftCutoff = cfg.pointer?.cutoff ?? 0.28;

          if (cfg.pointer) {
            const { ampPx, rotDeg, cutoff } = cfg.pointer;
            const mults = [1, 0.7, 0.55, 0.85, 0.65, 0.78];
            const xTos = drifts.map((d) => gsap.quickTo(d, "x", { duration: 0.6, ease: "power2.out" }));
            const yTos = drifts.map((d) => gsap.quickTo(d, "y", { duration: 0.6, ease: "power2.out" }));
            const rTos = drifts.map((d) => gsap.quickTo(d, "rotation", { duration: 0.8, ease: "power2.out" }));
            const onMove = (e: PointerEvent) => {
              if (progress.value > cutoff) return; // disattivata a convergenza avanzata
              const nx = (e.clientX / window.innerWidth) * 2 - 1;
              const ny = (e.clientY / window.innerHeight) * 2 - 1;
              drifts.forEach((_, i) => {
                xTos[i](nx * ampPx * mults[i % mults.length]);
                yTos[i](ny * ampPx * mults[i % mults.length]);
                rTos[i](nx * rotDeg * mults[i % mults.length]);
              });
            };
            window.addEventListener("pointermove", onMove, { passive: true });
            cleanups.push(() => window.removeEventListener("pointermove", onMove));
          }

          // ------- timeline scrubbed (unità 0-100) -------
          const animated = [
            ...slots,
            panel,
            fill,
            reflect,
            ...cards,
            headline,
            lead,
            ctaPrimary,
            ctaSecondary,
            ctaArrow,
          ];
          const sceneName = (p: number) => {
            const u = p * 100;
            if (u <= cfg.sceneBounds[0]) return "scene-01-campo";
            if (u <= cfg.sceneBounds[1]) return "scene-02-convergenza";
            if (u <= cfg.sceneBounds[2]) return "scene-03-piano";
            return "scene-04-invito";
          };

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: cfg.runway,
              pin: true,
              scrub: cfg.scrub,
              anticipatePin: 1,
              invalidateOnRefresh: cfg.invalidateOnRefresh,
              onToggle: (self) => {
                // will-change soltanto mentre la timeline è attiva
                gsap.set(animated, { willChange: self.isActive ? "transform, opacity, filter" : "auto" });
              },
              onUpdate: (self) => {
                progress.value = self.progress;
                if (self.progress > 0.001) {
                  if (idleState.tweens.length) stopIdle(true);
                } else {
                  scheduleIdleRestart();
                }
                if (self.progress > driftCutoff && !progress.driftFrozen) {
                  progress.driftFrozen = true;
                  zeroDrifts();
                } else if (self.progress <= driftCutoff && progress.driftFrozen) {
                  progress.driftFrozen = false;
                }
                if (hudProgressRef.current) {
                  hudProgressRef.current.textContent = `${(self.progress * 100).toFixed(1)}%`;
                }
                if (hudSceneRef.current) {
                  hudSceneRef.current.textContent = sceneName(self.progress);
                }
              },
              onRefresh: () => {
                updateHudViewport();
                threadRef.current?.refresh();
                apertureRef.current?.refresh();
              },
            },
          });

          // Signal Thread + Optical Aperture: osservatori passivi per frame.
          // Leggono tl.progress() (già smussato dallo scrub) così geometria e
          // finestre restano sincronizzate con i transform reali degli slot;
          // nessun tween aggiunto alla timeline.
          if (threadRef.current || apertureRef.current) {
            const threadTick = () => {
              const p = tl.progress();
              threadRef.current?.update(p);
              apertureRef.current?.update(p);
            };
            gsap.ticker.add(threadTick);
            cleanups.push(() => gsap.ticker.remove(threadTick));
          }

          // --- SCENA 1: micro-parallasse per profondità + rotazioni residue ---
          cfg.frags.forEach((f) => {
            const vars: gsap.TweenVars = {
              y: -cfg.parallaxY[f.depth - 1],
              rotation: f.rot0 + f.drift,
              duration: cfg.fieldEnd,
            };
            const px = cfg.parallaxX[f.depth - 1];
            if (px !== 0) vars.x = px;
            tl.to(slotOf(f), vars, 0);
          });

          // --- SCENA 2: convergenza, traiettorie curve individuali ---
          cfg.frags.forEach((f) => {
            const slot = slotOf(f);
            const dur = f.end - f.start;
            // destinazione: assoluta (desktop) o relativa al centro del pannello (mobile),
            // funzionale così invalidateOnRefresh la ricalcola su resize/barra indirizzi
            const destinationOffset = () =>
              f.destFromPanelRatio
                ? {
                    x: panel.offsetWidth * f.destFromPanelRatio.x,
                    y: panel.offsetHeight * f.destFromPanelRatio.y,
                  }
                : f.destFromPanel!;
            const hasRelativeDestination = f.destFromPanel || f.destFromPanelRatio;
            const dx = hasRelativeDestination
              ? () => panelCenter().x + destinationOffset().x - slotCenter(slot).x
              : f.dx;
            const dy = hasRelativeDestination
              ? () => panelCenter().y + destinationOffset().y - slotCenter(slot).y
              : f.dy;
            tl.to(slot, { x: dx, ease: f.easeX, duration: dur }, f.start);
            tl.to(slot, { y: dy, ease: f.easeY, duration: dur }, f.start);
            tl.to(slot, { scale: f.scale, ease: "power1.inOut", duration: dur }, f.start);
            if (f.wobble) {
              // lo scontrino ondeggia: leggero, va e viene prima di allinearsi
              tl.to(slot, { rotation: f.rot0 + 6, ease: "sine.inOut", duration: dur * 0.3 }, f.start)
                .to(slot, { rotation: f.rot0 - 4, ease: "sine.inOut", duration: dur * 0.3 }, f.start + dur * 0.3)
                .to(slot, { rotation: f.rot, ease: "sine.out", duration: dur * 0.4 }, f.start + dur * 0.6);
            } else {
              tl.to(slot, { rotation: f.rot, ease: "power1.inOut", duration: dur }, f.start);
            }
            tl.to(slot, { opacity: f.opacity, ease: "power1.in", duration: dur * 0.55 }, f.start + dur * 0.45);
            if (f.blur > 0) {
              tl.to(slot, { filter: `blur(${f.blur}px)`, ease: "power1.in", duration: dur * 0.5 }, f.start + dur * 0.5);
            }
          });

          // Sprint 3 — il dato critico prende il controllo prima della lente.
          // L'enfasi è temporanea e interna al pannello dati: nessuna nuova
          // geometria, e al 49% il contenuto torna neutro mentre viene assorbito.
          if (cfg.climax && criticalRow && criticalContext.length) {
            tl.set(criticalRow, { transformOrigin: "100% 50%" }, 38);
            tl.to(criticalContext, { opacity: 0.32, ease: "power1.inOut", duration: 5 }, 38);
            tl.to(criticalRow, { scale: 1.025, ease: "power2.out", duration: 5 }, 38);
            tl.to(criticalContext, { opacity: 1, ease: "power1.inOut", duration: 4 }, 45);
            tl.to(criticalRow, { scale: 1, ease: "power1.inOut", duration: 4 }, 45);
          }

          // pannello: guadagna corpo, riflesso tenue, caption che affiora
          const fillDuration = cfg.climax
            ? Math.max(0, cfg.climax.panelResolveAt[0] - cfg.fillAt[0])
            : cfg.fillAt[1];
          tl.to(
            fill,
            {
              opacity: cfg.climax?.panelFillHoldOpacity ?? 1,
              ease: "power1.inOut",
              duration: fillDuration,
            },
            cfg.fillAt[0]
          );
          if (cfg.climax) {
            tl.to(
              fill,
              { opacity: 1, ease: "power2.out", duration: cfg.climax.panelResolveAt[1] },
              cfg.climax.panelResolveAt[0]
            );
          }
          tl.to(reflect, { opacity: 1, ease: "power1.in", duration: cfg.reflectAt[1] }, cfg.reflectAt[0]);
          tl.to(planCaption, { opacity: 0.85, ease: "power1.inOut", duration: cfg.captionAt[1] }, cfg.captionAt[0]);
          if (cfg.panelIntro) {
            tl.to(
              panel,
              { scale: 1, rotationY: cfg.panelIntro.rotationYMid, ease: "power1.inOut", duration: cfg.fillAt[1] },
              cfg.fillAt[0]
            );
          }
          if (cfg.panelScaleY !== undefined) {
            // il vassoio parte basso nel visual-stage (mai isolato: i frammenti ne
            // coprono l'area) e sale verso il centro mentre cresce dal fondo.
            // Offset calcolato dai box di layout, non da coordinate viewport.
            const panelDy0 = () => {
              const stageBottom = field.offsetTop + field.offsetHeight;
              const panelBottom = panel.offsetTop + panel.offsetHeight;
              const bottomClearance = theme === "segnale" && isMobile ? 24 : 8;
              return Math.max(0, stageBottom - bottomClearance - panelBottom);
            };
            tl.fromTo(
              panel,
              { y: panelDy0, scaleY: cfg.panelScaleY },
              { y: 0, scaleY: 1, ease: "power1.inOut", duration: cfg.fillAt[1], immediateRender: true },
              cfg.fillAt[0]
            );
          }

          // primo indizio del risultato (46-56%): sagoma della card 1 — filetto
          // terracotta e numero appena leggibili, niente "rettangolo con nebbia"
          if (cfg.cardHint && !cfg.climax && cards[0]) {
            tl.to(cards[0], { opacity: 0.3, y: cfg.cardY * 0.65, ease: "power1.inOut", duration: 10 }, 46);
          }

          // --- SCENA 3: le tre schede emergono in sequenza ---
          cards.forEach((card, i) => {
            const s = cfg.cardStarts[i] ?? cfg.cardStarts[2];
            if (i === 0 && cfg.climax) {
              // La priorità 1 è il payoff, non il primo elemento di uno
              // stagger meccanico: è presente nel frame 54 e diventa piena
              // entro il 57%, mentre le card 2/3 conservano il ritmo 60/66.
              tl.set(card, { opacity: cfg.climax.firstCardOpacityFrom }, s);
              tl.to(
                card,
                { opacity: 1, ease: "power2.out", duration: cfg.climax.firstCardOpacityDuration },
                s
              );
              tl.to(
                card,
                {
                  y: 1,
                  rotationX: 0,
                  scale: 1,
                  ease: "power2.out",
                  duration: cfg.climax.firstCardMotionDuration,
                },
                s
              );
              tl.to(card, { y: 0, ease: "power1.inOut", duration: 2 }, s + cfg.climax.firstCardMotionDuration);
              tl.to(card, { "--card-sh": 1, ease: "power1.in", duration: 3 }, s + 1);
              return;
            }
            tl.to(card, { opacity: 1, ease: "power1.out", duration: 7 }, s);
            tl.to(card, { y: 2, rotationX: 0, scale: 1, ease: "power2.out", duration: 9 }, s);
            tl.to(card, { y: 0, ease: "power1.inOut", duration: 3 }, s + 9); // settle, niente bounce
            tl.to(card, { "--card-sh": 1, ease: "power1.in", duration: 3 }, s + 8);
          });

          // residui: sfocatura più decisa mentre emerge il piano
          const residui = cfg.frags.filter((f) => f.opacity >= 0.3 && f.blur > 0);
          residui.forEach((f) => {
            tl.to(
              slotOf(f),
              { filter: `blur(${f.blur + cfg.residualBlurAt[1]}px)`, ease: "power1.inOut", duration: 8 },
              cfg.residualBlurAt[0]
            );
          });

          // --- SCENA 4: stabilizzazione e invito ---
          if (cfg.finalPayoff) {
            const payoff = cfg.finalPayoff;
            const [attentionStart, attentionDuration] = payoff.attentionAt;
            const [ctaStart, ctaDuration] = payoff.ctaAt;
            const [arrowStart, arrowDuration] = payoff.arrowAt;

            // Il piano resta pieno e leggibile; a cedere sono soltanto i
            // concorrenti ottici. I valori finali derivano dalle opacità già
            // approvate dei frammenti, quindi nessun contenuto scompare di colpo.
            tl.to(
              headline,
              { opacity: payoff.headlineOpacity, ease: "power1.inOut", duration: attentionDuration },
              attentionStart
            );
            tl.to(
              lead,
              { opacity: payoff.leadOpacity, ease: "power1.inOut", duration: attentionDuration },
              attentionStart
            );
            tl.to(
              ctaSecondary,
              { opacity: payoff.secondaryCtaOpacity, ease: "power1.inOut", duration: attentionDuration },
              attentionStart
            );
            cfg.frags.forEach((fragment) => {
              tl.to(
                slotOf(fragment),
                {
                  opacity: fragment.opacity * payoff.fragmentOpacityFactor,
                  ease: "power1.inOut",
                  duration: attentionDuration,
                },
                attentionStart
              );
            });

            // Contrasto, scala ottica e ombra sostituiscono la saturazione
            // impercettibile sull'antracite. Tutto termina entro l'88%.
            tl.to(
              ctaPrimary,
              {
                filter: "contrast(1)",
                scale: payoff.ctaScale,
                "--cta-sh": 1,
                ease: "power2.out",
                duration: ctaDuration,
              },
              ctaStart
            );
            tl.to(
              ctaArrow,
              { x: cfg.arrowX, ease: "sine.inOut", duration: arrowDuration },
              arrowStart
            );

            // Tween senza target visivo: conserva la scala 0–100 e rende
            // esplicito l'hold 88–100 prima del rilascio del pin.
            tl.to({}, { duration: 12 }, 88);
          } else {
            if (cfg.panelIntro) {
              tl.to(panel, { rotationY: cfg.panelIntro.rotationYEnd, ease: "power1.out", duration: 8 }, 88);
            }
            tl.to(
              ctaPrimary,
              { filter: "saturate(1)", "--cta-sh": 1, ease: "power1.inOut", duration: 12 },
              88
            );
            tl.to(ctaArrow, { x: cfg.arrowX, ease: "sine.inOut", duration: 12 }, 88);
          }

          return () => {
            cleanups.forEach((fn) => fn());
          };
        }
      );
    }, stage);

    // ------- ripristino dello scroll dopo la creazione del pin -------
    // Il pin del hero aggiunge la runway al documento soltanto a idratazione
    // avvenuta. Hash, refresh e back/forward vengono applicati dal browser
    // prima, su un documento ancora corto di una runway intera: la posizione
    // finisce clampata e si atterra fino a 260svh più in alto. S01-S03 non
    // hanno il problema perché la loro runway è dichiarata in CSS.
    const scrollKey = `hero-live:${window.location.pathname}`;
    const saveScroll = () => sessionStorage.setItem(scrollKey, String(window.scrollY));
    window.addEventListener("pagehide", saveScroll);

    ScrollTrigger.refresh();

    const restoreScroll = () => {
      const hash = window.location.hash;
      const target = hash ? document.querySelector(hash) : null;
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
        return;
      }
      // back/forward: correggiamo soltanto un ripristino già avvenuto e clampato,
      // mai la posizione di un ingresso pulito (scrollY 0).
      const saved = Number(sessionStorage.getItem(scrollKey));
      if (window.scrollY > 0 && saved > window.scrollY) window.scrollTo(0, saved);
    };
    restoreScroll();
    // il router ripristina lo scroll dopo il commit: ripassiamo al frame dopo
    const restoreFrame = requestAnimationFrame(restoreScroll);

    // ------- ambient Polaroid: pausa quando non visibile -------
    const polaroidWindow = stage.querySelector<HTMLElement>(".polaroid-window");
    let ambientIo: IntersectionObserver | null = null;
    if (polaroidWindow) {
      ambientIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            polaroidWindow.classList.toggle("ambient-paused", !e.isIntersecting);
          });
        },
        { threshold: 0.05 }
      );
      ambientIo.observe(polaroidWindow);
    }

    // ------- overlay debug -------
    updateHudViewport();
    let onResize: (() => void) | null = null;
    if (debug) {
      onResize = updateHudViewport;
      window.addEventListener("resize", onResize);
      const panel = stage.querySelector<HTMLElement>(".glass-panel--live");
      if (panel) {
        setPanelBox({ x: panel.offsetLeft, y: panel.offsetTop, w: panel.offsetWidth, h: panel.offsetHeight });
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const isIntermediate = window.matchMedia(
          "(min-width: 768px) and (max-width: 1439px)"
        ).matches;
        const themeConfigs = CONFIGS[theme];
        const cfg = isMobile
          ? themeConfigs.mobile
          : isIntermediate && themeConfigs.intermediate
            ? themeConfigs.intermediate
            : themeConfigs.desktop;
        const field = stage.querySelector<HTMLElement>(".fragment-field");
        setDebugDots(
          cfg.frags.map((f) => {
            const slot = stage.querySelector<HTMLElement>(`[data-frag="${f.key}"]`)!;
            if (f.destFromPanel || f.destFromPanelRatio) {
              const destinationOffset = f.destFromPanelRatio
                ? {
                    x: panel.offsetWidth * f.destFromPanelRatio.x,
                    y: panel.offsetHeight * f.destFromPanelRatio.y,
                  }
                : f.destFromPanel!;
              return {
                key: f.key,
                x: panel.offsetLeft + panel.offsetWidth / 2 + destinationOffset.x,
                y: panel.offsetTop + panel.offsetHeight / 2 + destinationOffset.y,
              };
            }
            const inField = slot.offsetParent === field;
            return {
              key: f.key,
              x: (inField && field ? field.offsetLeft : 0) + slot.offsetLeft + slot.offsetWidth / 2 + f.dx,
              y: (inField && field ? field.offsetTop : 0) + slot.offsetTop + slot.offsetHeight / 2 + f.dy,
            };
          })
        );
      }
    }

    return () => {
      // prima di ctx.revert(): rimuovere il pin accorcia il documento e
      // clamperebbe la posizione che stiamo salvando.
      cancelAnimationFrame(restoreFrame);
      saveScroll();
      window.removeEventListener("pagehide", saveScroll);
      if (onResize) window.removeEventListener("resize", onResize);
      ambientIo?.disconnect();
      ctx.revert();
    };
  }, [debug, theme]);

  return (
    <main className="stage stage--live" data-theme={theme} ref={stageRef}>
      <div className="vh-probe vh-probe--svh" ref={svhProbeRef} aria-hidden="true" />
      <div className="vh-probe vh-probe--dvh" ref={dvhProbeRef} aria-hidden="true" />
      <div className="live-canvas">
        <div className="hero-texture" aria-hidden="true" />
        <Nav content={heroCopy} />
        <section className="hero-copy">
          <h1 className="headline">
            {heroCopy.headlineLines.map((line, index) => (
              <span key={line}>
                {index > 0 && (
                  <>
                    <br />{" "}
                  </>
                )}
                {line}
              </span>
            ))}
          </h1>
          <p className="lead">{heroCopy.lead}</p>
          <Ctas content={heroCopy} onPrimaryClick={handlePrimaryClick} />
        </section>

        <div className="fragment-field" aria-label="Il rumore del marketing quotidiano">
          {(Object.keys(SLOT_VISUALS[theme]) as FragKey[]).map((key) => {
            const Fragment = SLOT_VISUALS[theme][key];
            return (
              <div
                key={key}
                className={`slot slot--${key} fragment-scroll-layer`}
                data-frag={key}
              >
                <div className="drift">
                  <div className="fragment-float-layer" data-fragment-float={key}>
                    <Fragment />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {theme === "segnale" && <SignalThread ref={threadRef} />}

        <div className="glass-panel glass-panel--live">
          <div className="glass-panel-fill" aria-hidden="true" />
          <div className="glass-panel-reflect" aria-hidden="true" />
          {theme === "segnale" && <OpticalAperture ref={apertureRef} />}
          <div className="glass-panel-inner">
            <PlanStack content={heroCopy} />
          </div>
        </div>

        <GrainOverlay />

        {debug && panelBox && (
          <div
            className="debug-panel-box"
            style={{ left: panelBox.x, top: panelBox.y, width: panelBox.w, height: panelBox.h }}
          />
        )}
        {debug &&
          debugDots.map((d) => (
            <div key={d.key}>
              <div className="debug-dot" style={{ left: d.x, top: d.y }} />
              <span className="debug-dot-label" style={{ left: d.x, top: d.y }}>
                {d.key}
              </span>
            </div>
          ))}
      </div>

      {debug && (
        <div className="debug-hud">
          progress: <span ref={hudProgressRef}>0.0%</span>
          <br />
          scena: <span ref={hudSceneRef}>scene-01-campo</span>
          <br />
          viewport: <span ref={hudViewportRef}>—</span>
        </div>
      )}
    </main>
  );
}
