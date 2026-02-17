"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Phone, Laptop, Shield, FileText } from "lucide-react";
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const router = useRouter();

  // Авто-выход при бездействии
  useInactivityLogout();

  // Показываем уведомление если был редирект из middleware
  useEffect(() => {
    const notice = document.cookie
      .split("; ")
      .find((c) => c.startsWith("auth_redirect_notice="));
    if (notice) {
      toast.info("Вы уже авторизованы в системе");
      // Удаляем cookie
      document.cookie = "auth_redirect_notice=; max-age=0; path=/";
    }
  }, []);

  // Middleware уже гарантирует авторизацию — просто получаем данные пользователя
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await apiClient.get("/api/auth/me");
      return res.data;
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
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Система защиты государственной тайны</h1>
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
          <motion.div variants={item}>
            <Link href="/personnel">
              <GlassCard className="p-6 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Личный состав</h3>
                    <p className="text-sm text-slate-400">Учёт и допуски</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/phones">
              <GlassCard className="p-6 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                    <Phone className="h-8 w-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Средства связи</h3>
                    <p className="text-sm text-slate-400">Хранение телефонов</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/equipment">
              <GlassCard className="p-6 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <Laptop className="h-8 w-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Вычислительная техника</h3>
                    <p className="text-sm text-slate-400">АРМ и ноутбуки</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/storage-and-passes">
              <GlassCard className="p-6 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                    <Shield className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Носители и пропуска</h3>
                    <p className="text-sm text-slate-400">Флешки и допуски</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          {user?.role === "admin" && (
            <motion.div variants={item}>
              <Link href="/users">
                <GlassCard className="p-6 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                      <Shield className="h-8 w-8 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">Пользователи</h3>
                      <p className="text-sm text-slate-400">Управление доступом</p>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          )}

          <motion.div variants={item}>
            <GlassCard className="p-6 cursor-pointer group opacity-60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-slate-500/10">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Генератор документов</h3>
                  <p className="text-sm text-slate-400">Скоро...</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}