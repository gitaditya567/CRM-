import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { X } from "lucide-react";
import { festivalForToday, FESTIVAL_THEMES } from "../../config/festivals";

/**
 * Festive strip on top of every page (all roles) — appears by itself on Indian festivals
 * (see config/festivals.js) and a few days before the big ones with a countdown.
 * Blinking light garland, flickering diyas, twinkling sparkles. Can be closed for the day.
 */
const BULBS = 36;

const dismissKey = (f, today) => `festival-dismissed:${f.key}:${today}`;
const readDismissed = (key) => { try { return localStorage.getItem(key) === "1"; } catch { return false; } };
const writeDismissed = (key) => { try { localStorage.setItem(key, "1"); } catch { /* storage blocked */ } };

const FestivalBanner = () => {
    const { active, upcoming, today } = useMemo(() => festivalForToday(), []);
    const festival = active || upcoming?.festival;
    const key = festival ? dismissKey(festival, today) : "";
    const [hidden, setHidden] = useState(() => !festival || readDismissed(key));

    if (!festival) return null;
    const theme = FESTIVAL_THEMES[festival.theme] || FESTIVAL_THEMES.festive;
    // countdown chip: the next festival while one is on, or this one when it is still coming
    const countdown = active ? (upcoming && upcoming.festival.key !== active.key ? upcoming : null) : upcoming;
    const message = active
        ? active.greetingToday
        : `${festival.name} aa rahi hai — taiyaari shuru! ${upcoming.days === 1 ? "Bas kal hai" : `Sirf ${upcoming.days} din baaki`}`;

    const close = () => { writeDismissed(key); setHidden(true); };

    return (
        <MotionConfig reducedMotion="user">
            <AnimatePresence>
                {!hidden && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="overflow-hidden"
                        role="region"
                        aria-label={`${festival.name} greetings`}
                    >
                        <div className={`festival-strip relative bg-gradient-to-r ${theme.bg} text-white shadow-md`}>
                            {/* light garland hanging along the top edge */}
                            <div className="festival-wire absolute inset-x-0 top-0 h-3 flex justify-between px-2 pointer-events-none" aria-hidden="true">
                                {Array.from({ length: BULBS }, (_, i) => (
                                    <span key={i} className={`festival-bulb ${i % 3 === 2 ? "max-sm:hidden" : ""}`}
                                        style={{ "--bulb": theme.bulbs[i % theme.bulbs.length], animationDelay: `${(i % 6) * 0.25}s` }} />
                                ))}
                            </div>

                            {/* twinkling sparkles */}
                            {[8, 27, 46, 64, 83].map((left, i) => (
                                <span key={left} className="festival-sparkle absolute text-[10px] pointer-events-none max-sm:hidden" aria-hidden="true"
                                    style={{ left: `${left}%`, top: i % 2 ? "58%" : "30%", animationDelay: `${i * 0.6}s` }}>✦</span>
                            ))}

                            <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 pt-4 pb-2.5">
                                <motion.span
                                    className="festival-flicker text-xl sm:text-2xl shrink-0"
                                    initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.2 }}
                                    aria-hidden="true"
                                >{theme.decor[0]}</motion.span>

                                <motion.p
                                    className="flex-1 min-w-0 text-xs sm:text-sm font-black tracking-wide leading-snug"
                                    initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
                                >
                                    <span className="festival-shine">{message}</span>
                                    <span className="hidden md:inline font-semibold opacity-80"> — Team TeamInspire</span>
                                </motion.p>

                                <span className="hidden sm:flex gap-1.5 text-lg shrink-0" aria-hidden="true">
                                    {theme.decor.slice(1).map((d, i) => (
                                        <span key={i} className="festival-bob" style={{ animationDelay: `${i * 0.3}s` }}>{d}</span>
                                    ))}
                                </span>

                                {countdown && (
                                    <motion.span
                                        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: "spring" }}
                                        className="shrink-0 px-2.5 py-1 rounded-full bg-white/20 ring-1 ring-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
                                        title={`${countdown.festival.name} in ${countdown.days} day(s)`}
                                    >
                                        {(FESTIVAL_THEMES[countdown.festival.theme] || theme).decor[0]} {countdown.festival.name} · {countdown.days === 1 ? "kal" : `${countdown.days} din`}
                                    </motion.span>
                                )}

                                <button onClick={close} className="shrink-0 p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer" aria-label="Close festival banner for today" title="Aaj ke liye band karein">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <style>{`
                            .festival-wire::before { content: ""; position: absolute; left: 0; right: 0; top: 3px; border-top: 1px solid rgba(255,255,255,.35); }
                            .festival-bulb {
                                position: relative; top: 3px; width: 7px; height: 9px; border-radius: 50% 50% 45% 45%;
                                background: var(--bulb); box-shadow: 0 0 6px 2px var(--bulb);
                                animation: festival-blink 1.5s ease-in-out infinite;
                            }
                            @keyframes festival-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; box-shadow: none; } }
                            .festival-flicker { display: inline-block; animation: festival-flicker 1.8s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(253,224,71,.8)); }
                            @keyframes festival-flicker { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.08) rotate(-3deg); } 70% { transform: scale(.96) rotate(2deg); } }
                            .festival-bob { display: inline-block; animation: festival-bob 2.4s ease-in-out infinite; }
                            @keyframes festival-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
                            .festival-sparkle { animation: festival-twinkle 2.4s ease-in-out infinite; color: #fef9c3; }
                            @keyframes festival-twinkle { 0%, 100% { opacity: 0; transform: scale(.5); } 50% { opacity: 1; transform: scale(1.2); } }
                            .festival-shine {
                                background: linear-gradient(90deg, #fff 0%, #fff 40%, #fde68a 50%, #fff 60%, #fff 100%);
                                background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
                                animation: festival-shine 4s linear infinite;
                            }
                            @keyframes festival-shine { from { background-position: 100% 0; } to { background-position: -150% 0; } }
                            @media (prefers-reduced-motion: reduce) {
                                .festival-bulb, .festival-flicker, .festival-bob, .festival-sparkle, .festival-shine { animation: none; }
                                .festival-sparkle { opacity: .7; }
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </MotionConfig>
    );
};

export default FestivalBanner;
