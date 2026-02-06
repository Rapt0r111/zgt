import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Система учёта ЗГТ</CardTitle>
          <CardDescription>
            Автоматизированная система учёта защиты государственной тайны
          </CardDescription>
        </CardHeader>
        <div className="p-6 pt-0 space-y-4">
          <Button className="w-full" asChild>
            <Link href="/login">
              Войти в систему
            </Link>
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Версия 1.0.0
          </p>
        </div>
      </Card>
    </main>
  );
}