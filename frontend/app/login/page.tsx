"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Loader2, AlertCircle } from "lucide-react";
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
import { toast } from "sonner";

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

	useEffect(() => {
		const reason = searchParams.get("reason");
		if (reason === "inactivity") {
			toast.warning("Вы были автоматически выйдены из системы из-за неактивности");
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
				// Защита от петли: если redirect указывает на /login — идём на dashboard
				const finalRedirect = safeRedirect === "/login" ? "/dashboard" : safeRedirect;
				router.push(finalRedirect);
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
					"Превышено время ожидания ответа сервера. Проверьте соединение.",
				);
			} else if (
				errorData.code === "ECONNABORTED" ||
				errorData.message?.includes("timeout")
			) {
				setError(
					`Сервер не отвечает по адресу ${API_BASE_URL}`,);
			} else if (
				errorData.code === "ERR_NETWORK" ||
				errorData.message?.includes("Network Error")
			) {
				setError(
					"Ошибка сети. Проверьте запуск backend и настройки CORS.",
				);
			} else if (errorData.response?.status === 429) {
				setError(
					"Слишком много попыток входа. Попробуйте через 15 минут.",
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
		<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-foreground">
			{/* Фоновый эффект свечения */}
			<div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse" />

			<Card className="w-full max-w-md glass-elevated border-white/10 shadow-2xl overflow-hidden">
				{/* Декоративная линия сверху */}
				<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary/50 to-transparent" />

				<CardHeader className="text-center space-y-2 pt-8">
					<div className="mx-auto w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-2">
						<Lock className="h-6 w-6 text-primary" />
					</div>
					<CardTitle className="text-2xl font-bold tracking-tight">Вход в систему</CardTitle>
					<CardDescription className="text-muted-foreground">
						Доступ к автоматизированному рабочему месту
					</CardDescription>
				</CardHeader>

				<form onSubmit={handleLogin}>
					<CardContent className="space-y-4 pt-4">
						{error && (
							<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground animate-in fade-in zoom-in duration-300">
								<div className="flex items-center gap-2">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription className="whitespace-pre-line text-xs font-medium">
										{error}
									</AlertDescription>
								</div>
							</Alert>
						)}

						<div className="space-y-2">
							<Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Идентификатор (Логин)
							</Label>
							<Input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="Введите логин"
								className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11"
								required
								disabled={isLoading}
								autoFocus
								autoComplete="username"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password" id="pass-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Пароль
							</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="bg-background/50 border-white/10 focus:border-primary/50 transition-all h-11"
								required
								disabled={isLoading}
								autoComplete="current-password"
							/>
						</div>
					</CardContent>

					<CardFooter className="pb-8 pt-2">
						<Button
							type="submit"
							className="w-full h-11 font-bold gradient-primary border-0 shadow-lg active:scale-[0.98] transition-all"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Авторизация...
								</>
							) : (
								"Войти в систему"
							)}
						</Button>
					</CardFooter>
				</form>

				<div className="bg-white/5 border-t border-white/5 p-4 text-center">
					<div className="flex items-center justify-center gap-2 opacity-40">
						<ShieldCheck className="h-3 w-3" />
						<span className="text-[10px] uppercase tracking-widest font-mono">
							Защищенное соединение
						</span>
					</div>
				</div>
			</Card>
		</div>
	);
}