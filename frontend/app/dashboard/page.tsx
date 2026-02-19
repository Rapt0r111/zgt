"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Smartphone, Laptop, Shield, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass/GlassCard";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import apiClient from "@/lib/api/client";

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface NavCard {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  colorClass: string;
  adminOnly?: boolean;
}

const NAV_CARDS: NavCard[] = [
  { href: "/personnel", icon: Users, title: "Личный состав", subtitle: "Учёт и допуски", colorClass: "text-blue-400 bg-blue-500/10 group-hover:bg-blue-500/20" },
  { href: "/personal-items", icon: Smartphone, title: "Личные вещи", subtitle: "Телефоны и ноутбуки", colorClass: "text-green-400 bg-green-500/10 group-hover:bg-green-500/20" },
  { href: "/equipment", icon: Laptop, title: "Вычислительная техника", subtitle: "АРМ и оборудование", colorClass: "text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20" },
  { href: "/storage-and-passes", icon: Shield, title: "Носители и пропуска", subtitle: "Флешки и допуски", colorClass: "text-yellow-400 bg-yellow-500/10 group-hover:bg-yellow-500/20" },
  { href: "/acts", icon: FileText, title: "Генератор документов", subtitle: "Акты приема-передачи", colorClass: "text-cyan-400 bg-cyan-500/10 group-hover:bg-cyan-500/20" },
  { href: "/users", icon: Shield, title: "Пользователи", subtitle: "Управление доступом", colorClass: "text-red-400 bg-red-500/10 group-hover:bg-red-500/20", adminOnly: true },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const router = useRouter();

  useInactivityLogout();

  useEffect(() => {
    const notice = document.cookie
      .split("; ")
      .find((c) => c.startsWith("auth_redirect_notice="));
    if (notice) {
      toast.info("Вы уже авторизованы в системе");
      document.cookie = "auth_redirect_notice=; max-age=0; path=/";
    }
  }, []);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await apiClient.get("/api/auth/me");
      return res.data as User;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      router.push("/login");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const visibleCards = NAV_CARDS.filter((c) => !c.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Система защиты государственной тайны
            </h1>
            <p className="text-slate-400">
              Добро пожаловать,{" "}
              <span className="text-blue-400">{user?.full_name}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="glass border-white/20 text-white hover:bg-white/10"
          >
            Выход
          </Button>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.href} variants={item}>
                <Link href={card.href}>
                  <GlassCard className="p-6 cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg transition-colors ${card.colorClass}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">{card.title}</h3>
                        <p className="text-sm text-slate-400">{card.subtitle}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}