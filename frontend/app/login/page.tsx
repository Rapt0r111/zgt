'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('🔐 Попытка входа...', { username });
      console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
      
      // Отправляем запрос на сервер с таймаутом
      const response = await Promise.race([
        apiClient.post('/api/auth/login', { username, password }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: сервер не отвечает')), 10000)
        )
      ]) as any;

      console.log('✅ Ответ получен:', response.status);

      // Если успешно - перенаправляем на dashboard
      if (response.data?.access_token) {
        console.log('✅ Токен получен, перенаправление...');
        router.push('/dashboard');
        router.refresh();
      } else {
        throw new Error('Токен не получен');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Детальная обработка ошибок
      if (err.message === 'Timeout: сервер не отвечает') {
        setError('Сервер не отвечает. Убедитесь, что backend запущен на http://localhost:8000');
      } else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Ошибка сети. Проверьте: 1) Запущен ли backend, 2) Нет ли блокировки CORS');
      } else if (err.response?.status === 401) {
        setError('Неверный логин или пароль');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.message || 'Ошибка входа в систему');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Вход в систему</CardTitle>
          <CardDescription>
            Введите учетные данные для доступа к системе ЗГТ
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {/* Подсказка для разработчика */}
            
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}