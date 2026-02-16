"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  status?: "success" | "warning" | "danger";
}

export function StatCard({ title, value, icon: Icon, trend, status }: StatCardProps) {
  const statusColors = {
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
  };

  return (
    <GlassCard hover className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            {title}
          </p>
          <motion.p 
            className="text-3xl font-bold text-white"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          
          {trend && (
            <p className={`text-sm mt-2 ${statusColors[status || "success"]}`}>
              {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        
        <motion.div
          initial={{ rotate: -10, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className={`p-3 rounded-lg ${
            status === "danger" ? "bg-red-500/10" :
            status === "warning" ? "bg-yellow-500/10" :
            "bg-blue-500/10"
          }`}
        >
          <Icon className={`h-6 w-6 ${
            status === "danger" ? "text-red-500" :
            status === "warning" ? "text-yellow-500" :
            "text-blue-500"
          }`} />
        </motion.div>
      </div>
    </GlassCard>
  );
}