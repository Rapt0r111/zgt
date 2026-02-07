'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { equipmentApi } from '@/lib/api/equipment';
import { Plus, Search, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const EQUIPMENT_TYPES = ['АРМ', 'Ноутбук', 'Сервер', 'Принтер', 'Другое'];
const STATUSES = ['В работе', 'На складе', 'В ремонте', 'Списан'];

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', search, activeTab, typeFilter],
    queryFn: () => equipmentApi.getList({
      search: search || undefined,
      status: activeTab === 'all' ? undefined : activeTab,
      equipment_type: typeFilter === 'all' ? undefined : typeFilter,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['equipment-stats'],
    queryFn: () => equipmentApi.getStatistics(),
  });

  const { data: sealIssues } = useQuery({
    queryKey: ['seal-issues'],
    queryFn: () => equipmentApi.getSealIssues(),
  });

  const deleteMutation = useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast.success('Техника удалена');
    },
    onError: () => {
      toast.error('Ошибка при удалении');
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'В работе': 'default',
      'На складе': 'secondary',
      'В ремонте': 'outline',
      'Списан': 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getSealBadge = (sealStatus: string) => {
    if (sealStatus === 'Исправна') {
      return <Badge variant="default">Исправна</Badge>;
    } else if (sealStatus === 'Повреждена') {
      return <Badge variant="destructive">Повреждена</Badge>;
    } else {
      return <Badge variant="outline">Отсутствует</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к панели
            </Link>
          </Button>

          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Вычислительная техника</h1>
            <Button asChild>
              <Link href="/equipment/create">
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Link>
            </Button>
          </div>

          {/* Статистика */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total_equipment}</div>
                  <div className="text-sm text-muted-foreground">Всего техники</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.by_status['В работе'] || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">В работе</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.by_status['На складе'] || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">На складе</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{stats.seal_issues}</div>
                  <div className="text-sm text-muted-foreground">Проблемы с пломбами</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Предупреждение о проблемных пломбах */}
          {sealIssues && sealIssues.total > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-semibold text-red-900">
                  Внимание! Обнаружены проблемы с пломбами
                </div>
                <div className="text-sm text-red-700">
                  {sealIssues.total} единиц техники требуют проверки
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="ml-auto">
                <Link href="/equipment?filter=seal-issues">Просмотреть</Link>
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Поиск и фильтры</CardTitle>
              <div className="text-sm text-muted-foreground">
                Найдено: {data?.total || 0}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по инв. номеру, модели, местоположению..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Тип техники" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="В работе">В работе</TabsTrigger>
                <TabsTrigger value="На складе">На складе</TabsTrigger>
                <TabsTrigger value="В ремонте">В ремонте</TabsTrigger>
                <TabsTrigger value="Списан">Списан</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="text-center py-8">Загрузка...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Инв. номер</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Модель</TableHead>
                    <TableHead>Владелец</TableHead>
                    <TableHead>Местоположение</TableHead>
                    <TableHead>Пломба</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Нет данных. Создайте первую запись.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((equipment) => (
                      <TableRow key={equipment.id}>
                        <TableCell className="font-medium">
                          {equipment.inventory_number}
                        </TableCell>
                        <TableCell>{equipment.equipment_type}</TableCell>
                        <TableCell>
                          {equipment.manufacturer && `${equipment.manufacturer} `}
                          {equipment.model || '—'}
                        </TableCell>
                        <TableCell>
                          {equipment.current_owner_name ? (
                            <div>
                              <div>{equipment.current_owner_name}</div>
                              {equipment.current_owner_rank && (
                                <div className="text-xs text-muted-foreground">
                                  {equipment.current_owner_rank}
                                </div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{equipment.current_location || '—'}</TableCell>
                        <TableCell>
                          {equipment.seal_number ? (
                            <div>
                              <div className="text-xs">{equipment.seal_number}</div>
                              {getSealBadge(equipment.seal_status)}
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(equipment.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/equipment/${equipment.id}`}>
                                Открыть
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (confirm(`Удалить ${equipment.inventory_number}?`)) {
                                  deleteMutation.mutate(equipment.id);
                                }
                              }}
                            >
                              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}