"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORD = "SCRIPTIFY";
const COLORS = ["#FF3333", "#FF6B00", "#FFD600", "#33FF57", "#00C2FF", "#BF00FF", "#FF3333"];
const STAGGER_MS = 80;
const SUBTITLE_DELAY_MS = 800;
const LAST_LETTER_INDEX = WORD.length - 1;
const SUBTITLE_START_MS = LAST_LETTER_INDEX * STAGGER_MS + SUBTITLE_DELAY_MS;
const FADE_START_MS = SUBTITLE_START_MS + 1200;
const FADE_DURATION_S = 0.5;

export function IntroAnimation() {
  const [showIntro, setShowIntro] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setOverlayVisible(false), FADE_START_MS);
    return () => clearTimeout(t);
  }, []);

  const handleExitComplete = () => {
    setShowIntro(false);
  };

  if (!showIntro) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {overlayVisible && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: FADE_DURATION_S,
            ease: "easeIn",
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "#000000",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <motion.div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              overflow: "visible",
            }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: STAGGER_MS / 1000,
                  delayChildren: 0,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {WORD.split("").map((letter, i) => (
              <motion.span
                key={`${i}-${letter}`}
                variants={{
                  hidden: { scale: 4, opacity: 0 },
                  visible: {
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    },
                  },
                }}
                style={{
                  fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(52px, 10vw, 96px)",
                  letterSpacing: "-0.03em",
                  color: COLORS[i % COLORS.length],
                }}
              >
                <motion.span
                  animate={{
                    filter: [
                      "brightness(1)",
                      "brightness(1.15)",
                      "brightness(1)",
                    ],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  style={{ display: "inline-block" }}
                >
                  {letter}
                </motion.span>
              </motion.span>
            ))}
          </motion.div>

          <motion.p
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: SUBTITLE_START_MS / 1000,
              duration: 0.6,
              ease: "easeOut",
            }}
            style={{
              marginTop: 12,
              fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(14px, 3vw, 22px)",
              color: "#ffffff",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            act broke. stay rich.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
