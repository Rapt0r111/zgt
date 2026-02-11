"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import apiClient from "@/lib/api/client";

interface User {
	id: number;
	username: string;
	full_name: string;
	role: string;
}

// Тип для ошибок API
interface ApiError {
	response?: {
		data?: {
			detail?: string;
		};
		status?: number;
	};
	message?: string;
}

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await apiClient.get("/api/auth/me");
				setUser(response.data);
				setError(null);
			} catch (err: unknown) {
				const error = err as ApiError;
				setError(
					error.response?.data?.detail ||
						error.message ||
						"Ошибка загрузки данных",
				);

				if (error.response?.status === 401) {
					router.push("/login");
				}
			} finally {
				setIsLoading(false);
			}
		};

		fetchUser();
	}, [router]);

	const handleLogout = async () => {
		try {
			await apiClient.post("/api/auth/logout");
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			router.push("/login");
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
					<p className="text-lg">Загрузка...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<Card className="w-[400px]">
					<CardHeader>
						<CardTitle className="text-red-600">Ошибка</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
					<div className="p-6 space-y-4">
						<div className="flex gap-2">
							<Button
								onClick={() => window.location.reload()}
								variant="outline"
								className="flex-1"
							>
								Обновить
							</Button>
							<Button onClick={() => router.push("/login")} className="flex-1">
								На страницу входа
							</Button>
						</div>
					</div>
				</Card>
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
					<Link href="/personnel">
						<Card className="hover:shadow-lg transition-shadow cursor-pointer">
							<CardHeader>
								<CardTitle>Личный состав</CardTitle>
								<CardDescription>
									Учёт военнослужащих и их допусков
								</CardDescription>
							</CardHeader>
						</Card>
					</Link>

					<Link href="/phones">
						<Card className="hover:shadow-lg transition-shadow cursor-pointer">
							<CardHeader>
								<CardTitle>Средства связи</CardTitle>
								<CardDescription>Учёт личных телефонов</CardDescription>
							</CardHeader>
						</Card>
					</Link>

					<Link href="/equipment">
						<Card className="hover:shadow-lg transition-shadow cursor-pointer">
							<CardHeader>
								<CardTitle>Вычислительная техника</CardTitle>
								<CardDescription>
									Учёт АРМ, ноутбуков и носителей информации
								</CardDescription>
							</CardHeader>
						</Card>
					</Link>

					{user?.role === "admin" && (
						<Link href="/users">
							<Card className="hover:shadow-lg transition-shadow cursor-pointer">
								<CardHeader>
									<CardTitle>Пользователи</CardTitle>
									<CardDescription>
										Управление пользователями системы
									</CardDescription>
								</CardHeader>
							</Card>
						</Link>
					)}

					<Link href="/storage-and-passes">
						<Card className="hover:shadow-lg transition-shadow cursor-pointer">
							<CardHeader>
								<CardTitle>Носители и пропуска</CardTitle>
								<CardDescription>
									Учёт флешек и электронных пропусков
								</CardDescription>
							</CardHeader>
						</Card>
					</Link>

					<Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-50">
						<CardHeader>
							<CardTitle>Генератор документов</CardTitle>
							<CardDescription>Создание актов и описей</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</div>
		</div>
	);
}
