"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Eye, Plus, Search, Trash2, Monitor, Hash, MapPin, 
  User as UserIcon, Activity, Package, Wrench, Laptop
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equipmentApi } from "@/lib/api/equipment";

const EQUIPMENT_TYPES = ["АРМ", "ПЭВМ", "Ноутбук", "Сервер", "Принтер", "Другое"];

const STATUS_VARIANTS = {
  "В работе": "default",
  "На складе": "secondary",
  "В ремонте": "outline",
  "Сломан": "destructive",
} as const;

// Компонент для отображения мини-бара прогресса
const StatBar = ({ value, colorClass }: { value: number; colorClass: string }) => (
  <div className="h-1.5 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
    <div 
      className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }} 
    />
  </div>
);

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
      }, 500);
      return () => clearTimeout(timer);
    }, [search]);

  // Собираем параметры фильтрации в один объект
  const filterParams = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    status: activeTab === "all" ? undefined : activeTab,
    equipment_type: typeFilter === "all" ? undefined : typeFilter,
    is_personal: false, // Исключаем личную технику из списка и статистики
  }), [debouncedSearch, activeTab, typeFilter]);

  // Запрос списка техники
  const { data, isLoading } = useQuery({
    queryKey: ["equipment", filterParams],
    queryFn: () => equipmentApi.getList(filterParams),
  });

  // Запрос статистики
  const { data: stats } = useQuery({
    queryKey: ["equipment-stats", filterParams],
    queryFn: () => equipmentApi.getStatistics(filterParams),
  });

  const deleteMutation = useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-stats"] });
      toast.success("Техника удалена");
    },
    onError: () => {
      toast.error("Ошибка при удалении");
    },
  });

  // Вспомогательная функция для расчета процентов
  const getPercent = (val: number | undefined, total: number | undefined) => {
    if (!val || !total || total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  // Расчет метрик
  const totalItems = stats?.total_equipment || 0;
  const inWork = stats?.by_status?.["В работе"] || 0;
  const inStock = stats?.by_status?.["На складе"] || 0;
  const broken = (stats?.by_status?.["Сломан"] || 0) + (stats?.by_status?.["В ремонте"] || 0);
  
  // Health Score - процент исправной техники
  const healthScore = totalItems > 0 ? 100 - getPercent(broken, totalItems) : 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к панели
            </Link>
          </Button>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Вычислительная техника</h1>
            <Button asChild className="gradient-primary border-0 shadow-lg px-4">
              <Link href="/equipment/create">
                <Plus className="mr-2 h-4 w-4" />
                Добавить технику
              </Link>
            </Button>
          </div>

          {/* === БЛОК СТАТИСТИКИ === */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              
              {/* Карточка 1: Общее количество */}
              <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                <CardContent className="pt-6 pb-6 px-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                        Всего {typeFilter !== 'all' ? typeFilter : 'единиц'}
                      </div>
                      <div className="text-3xl font-bold tracking-tight">{totalItems}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 opacity-70">
                        Общий парк
                      </div>
                    </div>
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                      <Laptop className="h-5 w-5 text-indigo-400" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
              </Card>

              {/* Карточка 2: В работе */}
              <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <CardContent className="pt-6 pb-6 px-6 relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">В эксплуатации</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-bold text-emerald-400">{inWork}</div>
                        <span className="text-xs text-muted-foreground font-medium">{getPercent(inWork, totalItems)}%</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                      <Activity className="h-5 w-5 text-emerald-400" />
                    </div>
                  </div>
                  <StatBar value={getPercent(inWork, totalItems)} colorClass="bg-emerald-500" />
                </CardContent>
              </Card>

              {/* Карточка 3: На складе */}
              <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                <CardContent className="pt-6 pb-6 px-6 relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Резерв (Склад)</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-bold text-blue-400">{inStock}</div>
                        <span className="text-xs text-muted-foreground font-medium">{getPercent(inStock, totalItems)}%</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                      <Package className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <StatBar value={getPercent(inStock, totalItems)} colorClass="bg-blue-500" />
                </CardContent>
              </Card>

              {/* Карточка 4: Обслуживание / Здоровье */}
              <Card className="glass-elevated border-white/10 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                <CardContent className="pt-6 pb-6 px-6 relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Обслуживание</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-bold text-amber-400">{broken}</div>
                        <span className="text-xs text-muted-foreground font-medium">шт.</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                      <Wrench className="h-5 w-5 text-amber-400" />
                    </div>
                  </div>
                  
                  {/* Health Score Bar */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                     <span>Исправность парка</span>
                     <span className={healthScore > 90 ? "text-emerald-400" : "text-amber-400"}>{healthScore}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${healthScore > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                      style={{ width: `${healthScore}%` }} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* === ОСНОВНОЙ КОНТЕНТ (Поиск + Таблица) === */}
        <Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b pt-6 border-white/10 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                Поиск и фильтры
              </CardTitle>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                Найдено: {data?.total || 0}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-70">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Инв. номер, модель, место..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-white/10 focus:border-primary/50 transition-all"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-45 bg-background/50 border-white/10">
                  <SelectValue placeholder="Тип техники" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">Все типы</SelectItem>
                  {EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-background/50 border border-white/5 p-1 w-fit">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/20 px-4">Все</TabsTrigger>
                <TabsTrigger value="В работе" className="text-xs data-[state=active]:bg-primary/20 px-4">В работе</TabsTrigger>
                <TabsTrigger value="На складе" className="text-xs data-[state=active]:bg-primary/20 px-4">На складе</TabsTrigger>
                <TabsTrigger value="В ремонте" className="text-xs data-[state=active]:bg-primary/20 px-4">В ремонте</TabsTrigger>
                <TabsTrigger value="Сломан" className="text-xs data-[state=active]:bg-primary/20 px-4 text-destructive-foreground">Сломан</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        Загрузка данных...
                      </TableCell>
                    </TableRow>
                  ) : data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                        Техника не найдена.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((equipment) => (
                      <TableRow 
                        key={equipment.id} 
                        className="hover:bg-white/6 border-white/5 transition-colors group"
                      >
                        <TableCell className="px-6 py-4 font-mono text-xs text-primary/80 group-hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5 opacity-40" />
                            {equipment.inventory_number}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">{equipment.equipment_type}</span>
                            <span className="font-semibold text-foreground">
                              {equipment.manufacturer} {equipment.model}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span>S/N: {equipment.serial_number || "—"}</span>
                            <span className="opacity-70 text-[9px]">МНИ: {equipment.mni_serial_number || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 leading-tight">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <UserIcon className="h-3 w-3 opacity-40" />
                              <span className="truncate max-w-37.5">{equipment.current_owner_name || "—"}</span>
                            </div>
                            {equipment.current_owner_rank && (
                              <div className="text-[10px] text-muted-foreground pl-4.5 mt-0.5 opacity-80 italic">
                                {equipment.current_owner_rank}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            <MapPin className="h-3.5 w-3.5 opacity-40" />
                            <span className="truncate max-w-30">{equipment.current_location || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge
                            variant={STATUS_VARIANTS[equipment.status as keyof typeof STATUS_VARIANTS] || "default"}
                            className="whitespace-nowrap px-2 py-0.5 shadow-sm"
                          >
                            {equipment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 hover:bg-white/10 hover:text-primary transition-colors"
                              asChild
                              title="Открыть"
                            >
                              <Link href={`/equipment/${equipment.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              disabled={deleteMutation.isPending}
                              title="Удалить"
                              onClick={() => {
                                if (confirm(`Удалить ${equipment.inventory_number}?`)) {
                                  deleteMutation.mutate(equipment.id);
                                }
                              }}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}