"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Power, Search, User, ShieldCheck, Clock, Trash2, Settings2 } from "lucide-react";
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
			<Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 px-2 py-0.5 text-[10px]">
                <ShieldCheck className="h-3 w-3" />
                Администратор
            </Badge>
		) : (
			<Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-2 py-0.5 text-[10px]">
                Пользователь
            </Badge>
		);
	};

	const getStatusBadge = (isActive: boolean) => {
		return isActive ? (
			<Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-[10px]">
                Активен
            </Badge>
		) : (
			<Badge variant="outline" className="text-muted-foreground border-white/10 px-2 py-0.5 text-[10px]">
                Отключен
            </Badge>
		);
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-7xl mx-auto">
				<div className="mb-6">
					<Button variant="ghost" asChild className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к панели
						</Link>
					</Button>

					<div className="flex justify-between items-center mb-6">
						<h1 className="text-3xl font-bold tracking-tight">Пользователи</h1>
						<Button asChild className="gradient-primary border-0 shadow-lg px-4">
							<Link href="/users/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить пользователя
							</Link>
						</Button>
					</div>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b py-6 border-white/10 pb-6 space-y-4">
						<div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-muted-foreground" />
                                Управление доступом
                            </CardTitle>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                                Всего: {data?.total || 0}
                            </Badge>
                        </div>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по логину, ФИО..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 bg-background/50 border-white/10 focus:border-primary/50 transition-all"
								/>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-0">
						{isLoading ? (
							<div className="text-center py-20 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                Загрузка списка пользователей...
                            </div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Логин</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">ФИО</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Роль</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Последний вход</TableHead>
											<TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Действия</TableHead>
										</TableRow>
									</TableHeader>

									<TableBody>
										{data?.items.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={6}
													className="text-center py-20 text-muted-foreground"
												>
													Пользователи не найдены
												</TableCell>
											</TableRow>
										) : (
											data?.items.map((user) => (
												<TableRow 
                                                    key={user.id} 
                                                    className="hover:bg-white/6 border-white/5 transition-colors group"
                                                >
													<TableCell className="px-6 py-4 font-mono text-sm text-primary/80 group-hover:text-primary">
														{user.username}
													</TableCell>
													<TableCell className="px-6 py-4">
                                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                                            <User className="h-3.5 w-3.5 opacity-40" />
                                                            {user.full_name}
                                                        </div>
                                                    </TableCell>
													<TableCell className="px-6 py-4">{getRoleBadge(user.role)}</TableCell>
													<TableCell className="px-6 py-4 text-center">
														{getStatusBadge(user.is_active)}
													</TableCell>
													<TableCell className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Clock className="h-3.5 w-3.5 opacity-40" />
                                                            {user.last_login
                                                                ? new Date(user.last_login).toLocaleString("ru-RU", {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                  })
                                                                : "Никогда"}
                                                        </div>
													</TableCell>
													<TableCell className="px-6 py-4 text-right">
														<div className="flex justify-end gap-2">
															<Button
																size="sm"
																variant="ghost"
                                                                className="h-8 hover:bg-white/10 hover:text-primary transition-colors px-3"
																onClick={() => router.push(`/users/${user.id}`)}
															>
																Открыть
															</Button>
															<Button
																size="sm"
																variant="ghost"
                                                                className={`h-8 hover:bg-white/10 transition-colors px-3 ${user.is_active ? 'text-amber-500/80 hover:text-amber-500' : 'text-emerald-500/80 hover:text-emerald-500'}`}
																onClick={() =>
																	toggleActiveMutation.mutate(user.id)
																}
																disabled={toggleActiveMutation.isPending}
                                                                title={user.is_active ? "Деактивировать" : "Активировать"}
															>
																<Power className="h-4 w-4" />
															</Button>
															<Button
																size="sm"
																variant="ghost"
                                                                className="h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors px-3"
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
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}