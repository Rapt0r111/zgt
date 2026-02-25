"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, Plus, Search, XCircle, Smartphone,
  Hash, Box, User as UserIcon, History, Laptop, Eye, Trash2,
  MapPin, Monitor
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { phonesApi } from "@/lib/api/phones";
import { equipmentApi } from "@/lib/api/equipment";

// ─── Телефоны ────────────────────────────────────────────────────────────────

function PhonesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["phones", search, statusFilter],
    queryFn: () =>
      phonesApi.getList({
        search: search || undefined,
        status:
          statusFilter === "all"
            ? undefined
            : statusFilter === "issued"
              ? "Выдан"
              : "Сдан",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: phonesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phones"] });
      toast.success("Телефон удалён");
    },
    onError: () => toast.error("Ошибка при удалении"),
  });

  const getStatusBadge = (status: string) =>
    status === "Выдан" ? (
      <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-[10px]">
        <CheckCircle2 className="h-3 w-3" /> Выдан
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1 bg-white/5 text-muted-foreground border-white/10 px-2 py-0.5 text-[10px]">
        <XCircle className="h-3 w-3" /> Сдан
      </Badge>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по модели, IMEI, владельцу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-white/10 focus:border-primary/50"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-background/50 border border-white/5 p-1">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/20 px-4">Все</TabsTrigger>
              <TabsTrigger value="issued" className="text-xs data-[state=active]:bg-primary/20 px-4">Выдан</TabsTrigger>
              <TabsTrigger value="submitted" className="text-xs data-[state=active]:bg-primary/20 px-4">Сдан</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-white/10 bg-white/5 hover:bg-white/10">
            <Link href="/phones/batch">
              <History className="mr-2 h-4 w-4" /> Массовая сдача/выдача
            </Link>
          </Button>
          <Button asChild className="gradient-primary border-0 shadow-lg">
            <Link href="/phones/create">
              <Plus className="mr-2 h-4 w-4" /> Добавить
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Найдено: <span className="text-foreground font-medium">{data?.total || 0}</span>
        </span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Владелец</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Модель / Цвет</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">IMEI</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Ячейка</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  Телефоны не найдены.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((phone) => (
                <TableRow key={phone.id} className="hover:bg-white/6 border-white/5 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <UserIcon className="h-3.5 w-3.5 opacity-40" />
                        {phone.owner_full_name || "–"}
                      </div>
                      {phone.owner_rank && (
                        <div className="text-[10px] text-muted-foreground pl-5 mt-0.5 italic">{phone.owner_rank}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold">{phone.model || "–"}</span>
                      <span className="text-[11px] text-muted-foreground uppercase">{phone.color || "–"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      {phone.imei_1 && <div className="flex items-center gap-1"><Hash className="h-3 w-3 opacity-30" />{phone.imei_1}</div>}
                      {phone.imei_2 && <div className="flex items-center gap-1"><Hash className="h-3 w-3 opacity-30" />{phone.imei_2}</div>}
                      {!phone.imei_1 && !phone.imei_2 && "–"}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5 font-mono text-xs text-primary/80">
                      <Box className="h-3 w-3 opacity-40" />{phone.storage_location || "–"}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">{getStatusBadge(phone.status)}</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 hover:text-primary" asChild>
                        <Link href={`/phones/${phone.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm("Удалить телефон?")) deleteMutation.mutate(phone.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Ноутбуки (личные) ───────────────────────────────────────────────────────

function PersonalLaptopsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => ({
    equipment_type: "Ноутбук",
    is_personal: true,
    search: debouncedSearch.trim() || undefined,
    limit: 1000,
  }), [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ["equipment", params],
    queryFn: () => equipmentApi.getList(params),
  });

  const deleteMutation = useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Ноутбук удалён");
    },
    onError: () => toast.error("Ошибка при удалении"),
  });

  const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    "В работе": "default",
    "На складе": "secondary",
    "В ремонте": "outline",
    "Сломан": "destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Инв. номер, модель, владелец..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-white/10 focus:border-primary/50"
          />
        </div>
        <Button asChild className="gradient-primary border-0 shadow-lg">
          <Link href="/equipment/create?personal=true">
            <Plus className="mr-2 h-4 w-4" /> Добавить ноутбук
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Найдено: <span className="text-foreground font-medium">{data?.total || 0}</span>
        </span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Инв. №</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Модель</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">S/N</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Владелец</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Место</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  Ноутбуки не найдены.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((laptop) => (
                <TableRow key={laptop.id} className="hover:bg-white/6 border-white/5 transition-colors group">
                  <TableCell className="px-6 py-4 font-mono text-xs text-primary/80 group-hover:text-primary">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 opacity-40" />
                      {laptop.inventory_number || "–"}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{laptop.manufacturer} {laptop.model}</span>
                      {laptop.cpu && <span className="text-[10px] text-muted-foreground truncate max-w-40">{laptop.cpu}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
                    {laptop.serial_number || "–"}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <UserIcon className="h-3 w-3 opacity-40" />
                        <span className="truncate max-w-36">{laptop.current_owner_name || "–"}</span>
                      </div>
                      {laptop.current_owner_rank && (
                        <div className="text-[10px] text-muted-foreground pl-4.5 mt-0.5 italic">{laptop.current_owner_rank}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground">
                      <MapPin className="h-3.5 w-3.5 opacity-40" />
                      <span className="truncate max-w-28">{laptop.current_location || "–"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Badge variant={STATUS_VARIANTS[laptop.status] || "default"} className="whitespace-nowrap px-2 py-0.5">
                      {laptop.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 hover:text-primary" asChild>
                        <Link href={`/equipment/${laptop.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm(`Удалить ${laptop.inventory_number}?`)) deleteMutation.mutate(laptop.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function PersonalItemsPage() {
  const [activeTab, setActiveTab] = useState("phones");

  // Статистика для шапки
  const { data: phonesData } = useQuery({
    queryKey: ["phones", "", "all"],
    queryFn: () => phonesApi.getList({ limit: 1 }),
  });
  const { data: laptopsData } = useQuery({
    queryKey: ["equipment", { equipment_type: "Ноутбук", is_personal: true, limit: 1 }],
    queryFn: () => equipmentApi.getList({ equipment_type: "Ноутбук", is_personal: true, limit: 1 }),
  });
  const { data: statusReport } = useQuery({
    queryKey: ["phones", "status-report"],
    queryFn: () => phonesApi.getStatusReport(),
  });

  const notSubmittedCount = statusReport?.phones_not_submitted.length || 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к панели
          </Link>
        </Button>

        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Личные вещи</h1>
            <p className="text-muted-foreground mt-1">Телефоны и ноутбуки военнослужащих</p>
          </div>
        </div>

        {/* Карточки-статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-green-500/30 transition-all">
            <CardContent className="pt-6 pb-6 px-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Всего телефонов</div>
                  <div className="text-3xl font-bold">{phonesData?.total ?? "–"}</div>
                  {notSubmittedCount > 0 && (
                    <div className="text-[10px] text-orange-400 mt-1">
                      ⚠ {notSubmittedCount} не сдано
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                  <Smartphone className="h-5 w-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <CardContent className="pt-6 pb-6 px-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ноутбуков</div>
                  <div className="text-3xl font-bold">{laptopsData?.total ?? "–"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 opacity-70">Личных (не МО)</div>
                </div>
                <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                  <Laptop className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <CardContent className="pt-6 pb-6 px-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Телефонов сдано</div>
                  <div className="text-3xl font-bold text-emerald-400">{statusReport?.checked_in ?? "–"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 opacity-70">
                    из {statusReport?.total_phones ?? "–"} зарегистрированных
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                  <Monitor className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент с табами */}
        <Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10 py-5 px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-background/50 border border-white/5 p-1">
                <TabsTrigger value="phones" className="data-[state=active]:bg-primary/20 gap-2 px-5">
                  <Smartphone className="h-4 w-4" />
                  Телефоны
                  {notSubmittedCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-orange-500/80 text-white text-[9px] font-bold w-4 h-4">
                      {notSubmittedCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="laptops" className="data-[state=active]:bg-primary/20 gap-2 px-5">
                  <Laptop className="h-4 w-4" />
                  Ноутбуки
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-6">
            {activeTab === "phones" ? <PhonesTab /> : <PersonalLaptopsTab />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}