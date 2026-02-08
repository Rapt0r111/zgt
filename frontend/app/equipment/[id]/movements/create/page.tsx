'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { equipmentApi } from '@/lib/api/equipment';
import { personnelApi } from '@/lib/api/personnel';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cleanEmptyStrings } from '@/lib/utils/transform';

const MOVEMENT_TYPES = ['Передача', 'Возврат', 'Списание', 'Ремонт', 'Перемещение'];
const SEAL_STATUSES = ['Исправна', 'Повреждена', 'Отсутствует'];

const movementSchema = z.object({
  from_location: z.string().default(''),
  to_location: z.string().min(1, 'Укажите новое местоположение'),
  from_person_id: z.number().optional(),
  to_person_id: z.number().optional(),
  movement_type: z.string().min(1, 'Выберите тип перемещения'),
  document_number: z.string().default(''),
  document_date: z.string().default(''),
  reason: z.string().default(''),
  seal_number_before: z.string().default(''),
  seal_number_after: z.string().default(''),
  seal_status: z.string().default(''),
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function CreateMovementPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const equipmentId = parseInt(params.id as string);

  const { data: equipment } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: () => equipmentApi.getById(equipmentId),
  });

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
  } = useForm({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      from_location: '',
      to_location: '',
      movement_type: '',
      document_number: '',
      document_date: '',
      reason: '',
      seal_number_before: '',
      seal_number_after: '',
      seal_status: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: MovementFormData) => 
      equipmentApi.createMovement({ ...data, equipment_id: equipmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId, 'movements'] });
      toast.success('Перемещение зарегистрировано');
      router.push(`/equipment/${equipmentId}`);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Ошибка при создании');
      toast.error('Ошибка при создании');
    },
  });

  const onSubmit = (data: MovementFormData) => {
    setError('');
    const cleanedData = cleanEmptyStrings(data);
    createMutation.mutate(cleanedData as MovementFormData);
  };

  const currentMovementType = watch('movement_type');
  const currentFromPersonId = watch('from_person_id');
  const currentToPersonId = watch('to_person_id');
  const currentSealStatus = watch('seal_status');

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/equipment/${equipmentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к технике
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Создать перемещение</CardTitle>
            <p className="text-sm text-muted-foreground">
              {equipment.inventory_number} • {equipment.equipment_type}
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Тип перемещения */}
              <div className="space-y-2">
                <Label>Тип перемещения *</Label>
                <Select
                  value={currentMovementType}
                  onValueChange={(val) => setValue('movement_type', val)}
                >
                  <SelectTrigger className={errors.movement_type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.movement_type && (
                  <p className="text-sm text-destructive">{errors.movement_type.message as string}</p>
                )}
              </div>

              {/* Местоположение */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Местоположение</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_location">Откуда</Label>
                    <Input
                      id="from_location"
                      {...register('from_location')}
                      placeholder={equipment.current_location || "Текущее местоположение"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="to_location">Куда *</Label>
                    <Input
                      id="to_location"
                      {...register('to_location')}
                      placeholder="Новое местоположение"
                      className={errors.to_location ? 'border-destructive' : ''}
                    />
                    {errors.to_location && (
                      <p className="text-sm text-destructive">{errors.to_location.message as string}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ответственные лица */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Ответственные лица</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>От кого</Label>
                    <Select
                      value={currentFromPersonId?.toString() || ''}
                      onValueChange={(val) => setValue('from_person_id', val ? parseInt(val) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите (опционально)" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnelData?.items.map((person) => (
                          <SelectItem key={person.id} value={person.id.toString()}>
                            {person.rank ? `${person.rank} ` : ''}{person.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Кому</Label>
                    <Select
                      value={currentToPersonId?.toString() || ''}
                      onValueChange={(val) => setValue('to_person_id', val ? parseInt(val) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите (опционально)" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnelData?.items.map((person) => (
                          <SelectItem key={person.id} value={person.id.toString()}>
                            {person.rank ? `${person.rank} ` : ''}{person.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Документ */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Документ</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="document_number">Номер документа</Label>
                    <Input
                      id="document_number"
                      {...register('document_number')}
                      placeholder="№123 от 01.01.2024"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document_date">Дата документа</Label>
                    <Input
                      id="document_date"
                      type="date"
                      {...register('document_date')}
                    />
                  </div>
                </div>
              </div>

              {/* Пломба */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Пломба</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seal_number_before">Номер до</Label>
                    <Input
                      id="seal_number_before"
                      {...register('seal_number_before')}
                      placeholder={equipment.seal_number || "Старый номер"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seal_number_after">Номер после</Label>
                    <Input
                      id="seal_number_after"
                      {...register('seal_number_after')}
                      placeholder="Новый номер пломбы"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Состояние пломбы</Label>
                  <Select
                    value={currentSealStatus}
                    onValueChange={(val) => setValue('seal_status', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите состояние" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEAL_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Причина */}
              <div className="space-y-2">
                <Label htmlFor="reason">Причина перемещения</Label>
                <Textarea
                  id="reason"
                  {...register('reason')}
                  placeholder="Укажите причину перемещения..."
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t mt-6 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href={`/equipment/${equipmentId}`}>Отмена</Link>
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Создание...' : 'Создать перемещение'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}