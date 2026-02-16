"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: keyof typeof import("@/lib/design-tokens").designTokens.gradients;
}

export function GlassCard({ 
  children, 
  className, 
  hover = true,
  gradient 
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      className={cn(
        // Glass effect
        "relative overflow-hidden rounded-xl",
        "bg-white/70 dark:bg-slate-900/60",
        "backdrop-blur-md",
        "border border-white/20 dark:border-white/10",
        // Shadow
        "shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",
        // Transition
        "transition-all duration-300",
        hover && "hover:shadow-[0_20px_60px_-15px_rgba(0,0,205,0.3)]",
        className
      )}
    >
      {gradient && (
        <div 
          className="absolute inset-0 opacity-5"
          style={{ 
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` 
          }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}