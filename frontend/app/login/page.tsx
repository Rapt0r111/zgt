"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient, { API_BASE_URL } from "@/lib/api/client";
import { validateRedirectUrl } from "@/lib/utils/security";

interface LoginError {
	code?: string;
	message?: string;
	response?: {
		status?: number;
		data?: {
			detail?: string;
		};
	};
}

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = searchParams.get("redirect");

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => {
			controller.abort();
		}, 10000);

		try {
			const response = await apiClient.post(
				"/api/auth/login",
				{
					username,
					password,
				},
				{
					signal: controller.signal,
				},
			);

			if (response.data?.access_token) {
				const safeRedirect = validateRedirectUrl(redirectTo);
				router.push(safeRedirect);
			} else {
				throw new Error("Токен не получен");
			}
		} catch (err: unknown) {
			const errorData = err as LoginError;
			if (
				errorData.code === "ERR_CANCELED" ||
				errorData.message?.includes("canceled")
			) {
				setError(
					"Превышено время ожидания ответа сервера. Проверьте, что backend запущен на http://localhost:8000",
				);
			} else if (
				errorData.code === "ECONNABORTED" ||
				errorData.message?.includes("timeout")
			) {
				setError(
					`Сервер не отвечает. Проверьте доступность backend по адресу ${API_BASE_URL}`,);
			} else if (
				errorData.code === "ERR_NETWORK" ||
				errorData.message?.includes("Network Error")
			) {
				setError(
					"Ошибка сети. Проверьте:\n1) Запущен ли backend\n2) Нет ли блокировки CORS",
				);
			} else if (errorData.response?.status === 429) {
				setError(
					"Слишком много неудачных попыток входа. Попробуйте через 15 минут.",
				);
			} else if (errorData.response?.status === 401) {
				setError("Неверный логин или пароль");
			} else if (errorData.response?.data?.detail) {
				setError(errorData.response.data.detail);
			} else {
				setError("Ошибка входа в систему");
			}
		} finally {
			window.clearTimeout(timeoutId);
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
								<AlertDescription className="whitespace-pre-line">
									{error}
								</AlertDescription>
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
								autoComplete="username"
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
								autoComplete="current-password"
							/>
						</div>
					</CardContent>

					<CardFooter>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Вход..." : "Войти"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
