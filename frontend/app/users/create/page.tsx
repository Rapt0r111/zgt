"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi } from "@/lib/api/users";
import { getApiError } from "@/lib/utils/errors";
import type { UserCreate } from "@/types/user";

// Все роли из бэкенда (VALID_ROLES в schemas/user.py)
const ROLES = [
  { value: "admin", label: "Администратор" },
  { value: "officer", label: "Офицер" },
  { value: "operator", label: "Оператор" },
  { value: "user", label: "Пользователь" },
];

const PASSWORD_HINT = "Минимум 8 символов, заглавная и строчная буква, цифра";

const INITIAL_FORM: UserCreate = {
  username: "",
  full_name: "",
  password: "",
  role: "user",
};

export default function CreateUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserCreate>(INITIAL_FORM);

  const setField =
    <K extends keyof UserCreate>(key: K) =>
    (value: UserCreate[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success("Пользователь создан");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/users");
    },
    onError: (err: unknown) => {
      toast.error(getApiError(err, "Ошибка при создании пользователя"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.full_name.trim() || !form.password.trim()) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            asChild
            className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link href="/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к списку
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Новый пользователь</h1>
          <p className="text-muted-foreground mt-1 text-sm">Создание учётной записи для доступа к системе</p>
        </div>

        <Card className="glass-elevated border-white/10 shadow-2xl">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Данные пользователя
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Полное имя *
                </Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setField("full_name")(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Логин *
                </Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setField("username")(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="ivanov"
                  className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11 font-mono"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Пароль *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setField("password")(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11 pr-11"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">{PASSWORD_HINT}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Роль</Label>
                <Select value={form.role} onValueChange={(v) => setField("role")(v)}>
                  <SelectTrigger className="w-full bg-background/50 border-white/10 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/users")}
                  className="flex-1 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 gradient-primary border-0 shadow-lg"
                >
                  {mutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                    : "Создать пользователя"}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}