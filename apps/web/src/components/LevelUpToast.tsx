"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLevelUpStore } from "@/stores/levelUpStore";

const TOAST_DURATION_MS = 4000;
const FADE_OUT_MS = 300;

export function LevelUpToast() {
  const { show, level, levelName, hideToast } = useLevelUpStore();

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      hideToast();
    }, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [show, hideToast]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            exit: { duration: FADE_OUT_MS / 1000 },
          }}
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "14px 24px",
            background: "var(--accent)",
            color: "var(--accent-text)",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: "var(--radius-md)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
        >
          Level Up! You are now {levelName} Lv.{level}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
