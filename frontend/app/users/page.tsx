"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Power, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { usersApi } from "@/lib/api/users";

export default function UsersPage() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [search, setSearch] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["users", search],
		queryFn: () => usersApi.getList({ search: search || undefined }),
	});

	const deleteMutation = useMutation({
		mutationFn: usersApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success("Пользователь удалён");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			toast.error(
				error.response?.data?.detail || "Ошибка при выполнении операции",
			);
		},
	});

	const toggleActiveMutation = useMutation({
		mutationFn: usersApi.toggleActive,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success(data.message);
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			toast.error(
				error.response?.data?.detail || "Ошибка при выполнении операции",
			);
		},
	});

	const getRoleBadge = (role: string) => {
		return role === "admin" ? (
			<Badge variant="destructive">Администратор</Badge>
		) : (
			<Badge variant="secondary">Пользователь</Badge>
		);
	};

	const getStatusBadge = (isActive: boolean) => {
		return isActive ? (
			<Badge variant="default">Активен</Badge>
		) : (
			<Badge variant="outline">Деактивирован</Badge>
		);
	};

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-7xl mx-auto">
				<div className="mb-6">
					<Button variant="ghost" asChild className="mb-4">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к панели
						</Link>
					</Button>

					<div className="flex justify-between items-center">
						<h1 className="text-3xl font-bold">Пользователи</h1>
						<Button asChild>
							<Link href="/users/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить
							</Link>
						</Button>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Поиск</CardTitle>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по логину, ФИО..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						{isLoading ? (
							<div className="text-center py-8">Загрузка...</div>
						) : (
							<>
								<div className="mb-4 text-sm text-muted-foreground">
									Всего: {data?.total || 0}
								</div>

								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Логин</TableHead>
											<TableHead>ФИО</TableHead>
											<TableHead>Роль</TableHead>
											<TableHead>Статус</TableHead>
											<TableHead>Последний вход</TableHead>
											<TableHead className="text-right">Действия</TableHead>
										</TableRow>
									</TableHeader>

									<TableBody>
										{data?.items.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={6}
													className="text-center py-8 text-muted-foreground"
												>
													Нет пользователей
												</TableCell>
											</TableRow>
										) : (
											data?.items.map((user) => (
												<TableRow key={user.id}>
													<TableCell className="font-medium">
														{user.username}
													</TableCell>
													<TableCell>{user.full_name}</TableCell>
													<TableCell>{getRoleBadge(user.role)}</TableCell>
													<TableCell>
														{getStatusBadge(user.is_active)}
													</TableCell>
													<TableCell>
														{user.last_login
															? new Date(user.last_login).toLocaleString(
																	"ru-RU",
																)
															: "Никогда"}
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-2">
															<Button
																size="sm"
																variant="outline"
																onClick={() => router.push(`/users/${user.id}`)}
															>
																Открыть
															</Button>
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	toggleActiveMutation.mutate(user.id)
																}
																disabled={toggleActiveMutation.isPending}
															>
																<Power className="h-4 w-4" />
															</Button>
															<Button
																size="sm"
																variant="destructive"
																disabled={deleteMutation.isPending}
																onClick={() => {
																	if (
																		confirm(
																			`Удалить пользователя ${user.username}?`,
																		)
																	) {
																		deleteMutation.mutate(user.id);
																	}
																}}
															>
																Удалить
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
