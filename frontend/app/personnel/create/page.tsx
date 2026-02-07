'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { personnelApi } from '@/lib/api/personnel';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Схема валидации
const personnelSchema = z.object({
  full_name: z.string().min(1, 'ФИО обязательно'),
  rank: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  unit: z.string().optional().or(z.literal('')),
  personal_number: z.string().optional().or(z.literal('')),
  service_number: z.string().optional().or(z.literal('')),
  security_clearance_level: z.number().min(1).max(3).optional(),
  clearance_order_number: z.string().optional().or(z.literal('')),
  clearance_expiry_date: z.string().optional().or(z.literal('')),
  status: z.string().min(1, 'Статус обязателен'),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

export default function CreatePersonnelPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      full_name: '',
      rank: '',
      position: '',
      unit: '',
      personal_number: '',
      service_number: '',
      clearance_order_number: '',
      clearance_expiry_date: '',
      status: 'В строю',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PersonnelFormData) => personnelApi.create(data),
    onSuccess: () => {
      router.push('/personnel');
      router.refresh();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        // Если пришел массив ошибок от Pydantic (FastAPI)
        const messages = detail.map((d: any) => `${d.loc?.join('.') || ''}: ${d.msg}`).join('; ');
        setError(messages);
      } else if (typeof detail === 'object' && detail !== null) {
        // Если пришел один объект ошибки
        setError(detail.msg || 'Ошибка валидации на сервере');
      } else {
        setError('Ошибка при создании записи');
      }
    },
  });

  const onSubmit = (data: PersonnelFormData) => {
    setError('');
    createMutation.mutate(data);
  };

  // Наблюдаем за значениями для Select компонентов
  const currentStatus = watch('status');
  const currentClearance = watch('security_clearance_level');

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/personnel">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Добавить военнослужащего</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Основная информация */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Основная информация</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">ФИО *</Label>
                  <Input
                    id="full_name"
                    {...register('full_name')}
                    placeholder="Иванов Иван Иванович"
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rank">Звание</Label>
                    <Input id="rank" {...register('rank')} placeholder="Сержант" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Должность</Label>
                    <Input id="position" {...register('position')} placeholder="Командир отделения" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Подразделение</Label>
                  <Input id="unit" {...register('unit')} placeholder="1-й взвод" />
                </div>
              </div>

              {/* Служебные данные */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Служебные данные</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal_number">Личный номер (жетон)</Label>
                    <Input id="personal_number" {...register('personal_number')} placeholder="А-123456" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_number">Табельный номер</Label>
                    <Input id="service_number" {...register('service_number')} placeholder="987654" />
                  </div>
                </div>
              </div>

              {/* Допуск к ГТ */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Допуск к государственной тайне</h3>
                
                <div className="space-y-2">
                  <Label>Форма допуска</Label>
                  <Select
                    value={currentClearance?.toString()}
                    onValueChange={(val) => setValue('security_clearance_level', val ? parseInt(val) : undefined)}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clearance_order_number">Номер приказа о допуске</Label>
                    <Input id="clearance_order_number" {...register('clearance_order_number')} placeholder="№123 от 01.01.2024" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clearance_expiry_date">Дата окончания допуска</Label>
                    <Input id="clearance_expiry_date" type="date" {...register('clearance_expiry_date')} />
                  </div>
                </div>
              </div>

              {/* Статус */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Текущий статус</h3>
                
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={currentStatus}
                    onValueChange={(val) => setValue('status', val)}
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
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t mt-6 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/personnel">Отмена</Link>
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Сохранение...' : 'Создать запись'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}