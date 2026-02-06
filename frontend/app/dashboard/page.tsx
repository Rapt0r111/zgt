'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiClient.get('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        // Если ошибка авторизации - перенаправить на логин
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Система учёта ЗГТ</h1>
            <p className="text-slate-600 mt-1">
              Добро пожаловать, {user?.full_name}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Выход
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Личный состав</CardTitle>
              <CardDescription>
                Учёт военнослужащих и их допусков
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Вычислительная техника</CardTitle>
              <CardDescription>
                Учёт АРМ, ноутбуков и носителей информации
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Средства связи</CardTitle>
              <CardDescription>
                Учёт личных телефонов
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Генератор документов</CardTitle>
              <CardDescription>
                Создание актов и описей
              </CardDescription>
            </CardHeader>
          </Card>

          {user?.role === 'admin' && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Администрирование</CardTitle>
                <CardDescription>
                  Управление пользователями и логи
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}