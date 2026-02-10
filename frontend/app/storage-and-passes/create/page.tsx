'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { storageAndPassesApi } from '@/lib/api/storage-and-passes';
import { personnelApi } from '@/lib/api/personnel';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cleanEmptyStrings } from '@/lib/utils/transform';

const assetSchema = z.object({
  asset_type: z.enum(['flash_drive', 'electronic_pass'], {
    required_error: 'Выберите тип устройства',
  }),
  serial_number: z.string().min(1, 'Серийный номер обязателен'),
  model: z.string().default(''),
  manufacturer: z.string().default(''),
  status: z.enum(['in_use', 'stock', 'broken', 'lost']).default('stock'),
  assigned_to_id: z.number().optional(),
  capacity_gb: z.number().optional(),
  access_level: z.number().min(1).max(10).optional(),
  notes: z.string().default(''),
}).refine((data) => {
  if (data.asset_type === 'flash_drive' && !data.capacity_gb) {
    return false;
  }
  return true;
}, {
  message: 'Для флешки обязателен объём в ГБ',
  path: ['capacity_gb'],
}).refine((data) => {
  if (data.asset_type === 'electronic_pass' && !data.access_level) {
    return false;
  }
  return true;
}, {
  message: 'Для пропуска обязателен уровень доступа',
  path: ['access_level'],
}).refine((data) => {
  // Если выбран статус "В использовании", владелец обязателен
  if (data.status === 'in_use' && !data.assigned_to_id) {
    return false;
  }
  return true;
}, {
  message: 'Для статуса "В использовании" необходимо указать владельца',
  path: ['assigned_to_id'],
});

type AssetFormData = z.infer<typeof assetSchema>;

export default function CreateStorageAndPassPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  // Загружаем список сотрудников для выбора
  const { data: personnelData } = useQuery({
    queryKey: ['personnel'],
    queryFn: () => personnelApi.getList({ limit: 1000 }),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_type: undefined,
      serial_number: '',
      model: '',
      manufacturer: '',
      status: 'stock',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AssetFormData) => storageAndPassesApi.create(data),
    onSuccess: () => {
      toast.success('Актив добавлен');
      router.push('/storage-and-passes');
      router.refresh();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Ошибка при создании');
      toast.error('Ошибка при создании');
    },
  });

  const onSubmit = (data: AssetFormData) => {
    setError('');
    const cleanedData = cleanEmptyStrings(data);
    createMutation.mutate(cleanedData as AssetFormData);
  };

  const currentType = watch('asset_type');
  const currentStatus = watch('status');
  const currentOwnerId = watch('assigned_to_id');

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/storage-and-passes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Добавить носитель или пропуск</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Тип устройства */}
              <div className="space-y-2">
                <Label>Тип устройства *</Label>
                <Select
                  value={currentType}
                  onValueChange={(val) => setValue('asset_type', val as any, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.asset_type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flash_drive">USB-флешка</SelectItem>
                    <SelectItem value="electronic_pass">Электронный пропуск</SelectItem>
                  </SelectContent>
                </Select>
                {errors.asset_type && (
                  <p className="text-sm text-destructive">{errors.asset_type.message as string}</p>
                )}
              </div>

              {/* Серийный номер */}
              <div className="space-y-2">
                <Label htmlFor="serial_number">Серийный номер *</Label>
                <Input
                  id="serial_number"
                  {...register('serial_number')}
                  placeholder="ABC123XYZ"
                  className={errors.serial_number ? 'border-destructive' : ''}
                />
                {errors.serial_number && (
                  <p className="text-sm text-destructive">{errors.serial_number.message as string}</p>
                )}
              </div>

              {/* Производитель и модель */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Производитель</Label>
                  <Input
                    id="manufacturer"
                    {...register('manufacturer')}
                    placeholder="Kingston, Transcend..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Модель</Label>
                  <Input
                    id="model"
                    {...register('model')}
                    placeholder="DataTraveler 100 G3"
                  />
                </div>
              </div>

              {/* Специфические поля */}
              {currentType === 'flash_drive' && (
                <div className="space-y-2">
                  <Label htmlFor="capacity_gb">Объём (ГБ) *</Label>
                  <Input
                    id="capacity_gb"
                    type="number"
                    {...register('capacity_gb', { valueAsNumber: true })}
                    placeholder="16"
                    className={errors.capacity_gb ? 'border-destructive' : ''}
                  />
                  {errors.capacity_gb && (
                    <p className="text-sm text-destructive">{errors.capacity_gb.message as string}</p>
                  )}
                </div>
              )}

              {currentType === 'electronic_pass' && (
                <div className="space-y-2">
                  <Label htmlFor="access_level">Уровень доступа (1-10) *</Label>
                  <Input
                    id="access_level"
                    type="number"
                    {...register('access_level', { valueAsNumber: true })}
                    placeholder="3"
                    min="1"
                    max="10"
                    className={errors.access_level ? 'border-destructive' : ''}
                  />
                  {errors.access_level && (
                    <p className="text-sm text-destructive">{errors.access_level.message as string}</p>
                  )}
                </div>
              )}

              {/* Статус */}
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(val) => setValue('status', val as any, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">На складе</SelectItem>
                    <SelectItem value="in_use">Используется</SelectItem>
                    <SelectItem value="broken">Сломан</SelectItem>
                    <SelectItem value="lost">Утерян</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Владелец - показываем только если статус "В использовании" */}
              {currentStatus === 'in_use' && (
                <div className="space-y-2">
                  <Label>Владелец *</Label>
                  <Select
                    value={currentOwnerId?.toString() || ''}
                    onValueChange={(val) => setValue('assigned_to_id', val ? parseInt(val) : undefined, { shouldValidate: true })}
                  >
                    <SelectTrigger className={errors.assigned_to_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnelData?.items.map((person) => (
                        <SelectItem key={person.id} value={person.id.toString()}>
                          {person.rank ? `${person.rank} ` : ''}{person.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assigned_to_id && (
                    <p className="text-sm text-destructive">{errors.assigned_to_id.message as string}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    При статусе "Используется" необходимо указать владельца
                  </p>
                </div>
              )}

              {/* Примечания */}
              <div className="space-y-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Дополнительная информация..."
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t mt-6 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/storage-and-passes">Отмена</Link>
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Сохранение...' : 'Создать'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}