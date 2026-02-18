"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "@/lib/query-client";
import { initCsrf } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // При монтировании приложения запрашиваем CSRF-токен,
    // если пользователь уже авторизован (есть httpOnly cookie).
    // Это решает проблему F5 / открытие новой вкладки.
    initCsrf();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}