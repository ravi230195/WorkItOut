// components/SlideTransition.tsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

type Direction = "left" | "right" | "up" | "down";

function getAxisOffset(dir: Direction) {
  switch (dir) {
    case "left":
      return { x: "-100%" };
    case "right":
      return { x: "100%" };
    case "up":
      return { y: "-100%" };
    case "down":
      return { y: "100%" };
    default:
      return { x: 0 };
  }
}

type SlideTransitionProps = {
  show: boolean;
  /** Direction the element enters from */
  enterFrom?: Direction;
  /** Direction the element exits to */
  exitTo?: Direction;
  /** Animation duration in seconds */
  duration?: number;
  children: React.ReactNode;
};

export function SlideTransition({
  show,
  enterFrom = "right",
  exitTo = enterFrom,
  duration = 0.3,
  children,
}: SlideTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="slide"
          initial={getAxisOffset(enterFrom)}
          animate={{ x: 0, y: 0 }}
          exit={getAxisOffset(exitTo)}
          transition={{ type: "tween", ease: "easeInOut", duration }}
          style={{ position: "absolute", inset: 0 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
