'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { personnelApi } from '@/lib/api/personnel';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const personnelSchema = z.object({
  full_name: z.string().min(1, 'ФИО обязательно'),
  rank: z.string().optional(),
  position: z.string().optional(),
  unit: z.string().optional(),
  personal_number: z.string().optional(),
  service_number: z.string().optional(),
  security_clearance_level: z.number().min(1).max(3).optional(),
  clearance_order_number: z.string().optional(),
  clearance_expiry_date: z.string().optional(),
  status: z.string(),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

export default function PersonnelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const personnelId = parseInt(params.id as string);

  const { data: personnel, isLoading } = useQuery({
    queryKey: ['personnel', personnelId],
    queryFn: () => personnelApi.getById(personnelId),
  });

  const { data: clearanceCheck } = useQuery({
    queryKey: ['personnel', personnelId, 'clearance'],
    queryFn: () => personnelApi.checkClearance(personnelId),
    enabled: !!personnel,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
  });

  useEffect(() => {
    if (personnel) {
      reset({
        full_name: personnel.full_name,
        rank: personnel.rank || '',
        position: personnel.position || '',
        unit: personnel.unit || '',
        personal_number: personnel.personal_number || '',
        service_number: personnel.service_number || '',
        security_clearance_level: personnel.security_clearance_level,
        clearance_order_number: personnel.clearance_order_number || '',
        clearance_expiry_date: personnel.clearance_expiry_date || '',
        status: personnel.status,
      });
    }
  }, [personnel, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: PersonnelFormData) => personnelApi.update(personnelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', personnelId] });
      setIsEditing(false);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Ошибка при обновлении');
    },
  });

  const onSubmit = (data: PersonnelFormData) => {
    setError('');
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Военнослужащий не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/personnel">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">{personnel.full_name}</h1>
            <p className="text-muted-foreground mt-1">
              {personnel.rank} • {personnel.position}
            </p>
          </div>
          <Button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Отменить' : 'Редактировать'}
          </Button>
        </div>

        {/* Предупреждение об истекшем допуске */}
        {clearanceCheck?.is_expired && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Допуск к ГТ истёк {clearanceCheck.expiry_date}!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            {/* Основная информация */}
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">ФИО *</Label>
                    <Input
                      id="full_name"
                      {...register('full_name')}
                      disabled={!isEditing}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-destructive">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rank">Звание</Label>
                    <Input
                      id="rank"
                      {...register('rank')}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Должность</Label>
                    <Input
                      id="position"
                      {...register('position')}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Подразделение</Label>
                    <Input
                      id="unit"
                      {...register('unit')}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal_number">Личный номер</Label>
                    <Input
                      id="personal_number"
                      {...register('personal_number')}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_number">Табельный номер</Label>
                    <Input
                      id="service_number"
                      {...register('service_number')}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Допуск к ГТ */}
            <Card>
              <CardHeader>
                <CardTitle>Допуск к государственной тайне</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="security_clearance_level">Форма допуска</Label>
                  {isEditing ? (
                    <Select
                      defaultValue={personnel.security_clearance_level?.toString()}
                      onValueChange={(value) => setValue('security_clearance_level', value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите форму" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Форма 1</SelectItem>
                        <SelectItem value="2">Форма 2</SelectItem>
                        <SelectItem value="3">Форма 3</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {personnel.security_clearance_level ? (
                        <Badge>Форма {personnel.security_clearance_level}</Badge>
                      ) : (
                        <Badge variant="outline">Нет допуска</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clearance_order_number">Номер приказа</Label>
                    <Input
                      id="clearance_order_number"
                      {...register('clearance_order_number')}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clearance_expiry_date">Дата окончания</Label>
                    <Input
                      id="clearance_expiry_date"
                      type="date"
                      {...register('clearance_expiry_date')}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {clearanceCheck && (
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Статус допуска:</span>
                        <div className="mt-1">
                          {clearanceCheck.is_valid ? (
                            <Badge variant="default">Действителен</Badge>
                          ) : clearanceCheck.is_expired ? (
                            <Badge variant="destructive">Истёк</Badge>
                          ) : (
                            <Badge variant="outline">Не оформлен</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Статус */}
            <Card>
              <CardHeader>
                <CardTitle>Текущий статус</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  {isEditing ? (
                    <Select
                      defaultValue={personnel.status}
                      onValueChange={(value) => setValue('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="В строю">В строю</SelectItem>
                        <SelectItem value="В командировке">В командировке</SelectItem>
                        <SelectItem value="В госпитале">В госпитале</SelectItem>
                        <SelectItem value="В отпуске">В отпуске</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>
                      <Badge>{personnel.status}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}