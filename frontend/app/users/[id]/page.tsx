"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Eye, EyeOff, KeyRound, Loader2, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi } from "@/lib/api/users";
import { getApiError } from "@/lib/utils/errors";
import type { UserUpdate } from "@/types/user";

const ROLES = [
  { value: "admin", label: "Администратор" },
  { value: "officer", label: "Офицер ЗГТ" },
  { value: "operator", label: "Оператор" },
  { value: "user", label: "Пользователь" },
];

const PASSWORD_HINT = "Минимум 8 символов, заглавная и строчная буква, цифра";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<UserUpdate>({ username: "", full_name: "", role: "user", is_active: true });
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getById(Number(id)),
  });

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, full_name: user.full_name, role: user.role, is_active: user.is_active });
    }
  }, [user]);

  const setField = <K extends keyof UserUpdate>(key: K) => (value: UserUpdate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateMutation = useMutation({
    mutationFn: (data: UserUpdate) => usersApi.update(Number(id), data),
    onSuccess: () => {
      toast.success("Данные сохранены");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
    },
    onError: (err: unknown) => {
      toast.error(getApiError(err, "Ошибка при сохранении"));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (newPass: string) => usersApi.changePassword(Number(id), { new_password: newPass }),
    onSuccess: () => {
      toast.success("Пароль успешно изменён");
      setNewPassword("");
      setChangePassword(false);
    },
    onError: (err: unknown) => {
      toast.error(getApiError(err, "Ошибка при смене пароля"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const handlePasswordSave = () => {
    if (!newPassword.trim()) { toast.error("Введите новый пароль"); return; }
    passwordMutation.mutate(newPassword);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-foreground">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Пользователь не найден</p>
          <Button asChild variant="outline" className="border-white/10"><Link href="/users">Вернуться к списку</Link></Button>
        </div>
      </div>
    );
  }

  const isPending = updateMutation.isPending || passwordMutation.isPending;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
      <div className="max-w-2xl mx-auto">

        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <Link href="/users"><ArrowLeft className="mr-2 h-4 w-4" />Назад к списку</Link>
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{user.full_name}</h1>
              <p className="text-muted-foreground font-mono mt-1">{user.username}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {user.role === "admin" ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                  <ShieldCheck className="h-3 w-3" />Администратор
                </Badge>
              ) : (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Пользователь</Badge>
              )}
              {user.is_active
                ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Активен</Badge>
                : <Badge variant="outline" className="text-muted-foreground border-white/10 text-xs">Отключён</Badge>}
            </div>
          </div>
          {user.last_login && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <Clock className="h-3.5 w-3.5 opacity-40" />
              Последний вход: {new Date(user.last_login).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        <Card className="glass-elevated border-white/10 shadow-2xl mb-4">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Данные пользователя</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Полное имя</Label>
                <Input id="full_name" value={form.full_name ?? ""} onChange={(e) => setField("full_name")(e.target.value)}
                  className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Логин</Label>
                <Input id="username" value={form.username ?? ""}
                  onChange={(e) => setField("username")(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11 font-mono" required autoComplete="off" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Роль</Label>
                <Select value={form.role ?? "user"} onValueChange={(v) => setField("role")(v)}>
                  <SelectTrigger className="w-full bg-background/50 border-white/10 focus:border-primary/50 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium">Аккаунт активен</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Пользователь может войти в систему</p>
                </div>
                <button type="button" role="switch" aria-checked={form.is_active}
                  onClick={() => setField("is_active")(!form.is_active)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.is_active ? "bg-primary" : "bg-white/20"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.push("/users")}
                  className="flex-1 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5">Отмена</Button>
                <Button type="submit" disabled={isPending} className="flex-1 gradient-primary border-0 shadow-lg gap-2">
                  {updateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />Сохранение...</>) : (<><Save className="h-4 w-4" />Сохранить</>)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-elevated border-white/10 shadow-2xl">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />Смена пароля
              </CardTitle>
              <button type="button" role="switch" aria-checked={changePassword}
                onClick={() => { setChangePassword((v) => !v); setNewPassword(""); }}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${changePassword ? "bg-primary" : "bg-white/20"}`}>
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200 ${changePassword ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </CardHeader>
          {changePassword && (
            <CardContent className="pt-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Новый пароль</Label>
                  <div className="relative">
                    <Input id="new_password" type={showPassword ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                      className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11 pr-11" autoComplete="new-password" autoFocus />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground/60">{PASSWORD_HINT}</p>
                </div>
                <Button onClick={handlePasswordSave} disabled={passwordMutation.isPending || !newPassword.trim()} className="w-full gradient-primary border-0 shadow-lg gap-2">
                  {passwordMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />Сохранение...</>) : (<><KeyRound className="h-4 w-4" />Установить новый пароль</>)}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
}