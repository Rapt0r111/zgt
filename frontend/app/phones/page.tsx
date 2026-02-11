"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Plus, Search, XCircle } from "lucide-react";
import Link from "next/link";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { phonesApi } from "@/lib/api/phones";

export default function PhonesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState("all");

	const { data, isLoading } = useQuery({
		queryKey: ["phones", search, activeTab],
		queryFn: () =>
			phonesApi.getList({
				search: search || undefined,
				status:
					activeTab === "all"
						? undefined
						: activeTab === "issued"
							? "Выдан"
							: "Сдан",
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: phonesApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["phones"] });
			toast.success("Телефон удалён");
		},
		onError: () => {
			toast.error("Ошибка при удалении");
		},
	});

	const getStatusBadge = (status: string) => {
		return status === "Выдан" ? (
			<Badge variant="default" className="gap-1">
				<CheckCircle2 className="h-3 w-3" />
				Выдан
			</Badge>
		) : (
			<Badge variant="secondary" className="gap-1">
				<XCircle className="h-3 w-3" />
				Сдан
			</Badge>
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
						<h1 className="text-3xl font-bold">Средства связи</h1>
						<div className="flex gap-2">
							<Button variant="outline" asChild>
								<Link href="/phones/batch">Массовая сдача/выдача</Link>
							</Button>
							<Button asChild>
								<Link href="/phones/create">
									<Plus className="mr-2 h-4 w-4" />
									Добавить
								</Link>
							</Button>
						</div>
					</div>
				</div>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>Поиск</CardTitle>
							<div className="text-sm text-muted-foreground">
								Всего телефонов: {data?.total || 0}
							</div>
						</div>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по модели, IMEI, владельцу..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="mb-4"
						>
							<TabsList>
								<TabsTrigger value="all">Все</TabsTrigger>
								<TabsTrigger value="issued">Выдан</TabsTrigger>
								<TabsTrigger value="submitted">Сдан</TabsTrigger>
							</TabsList>
						</Tabs>

						{isLoading ? (
							<div className="text-center py-8">Загрузка...</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Владелец</TableHead>
										<TableHead>Модель</TableHead>
										<TableHead>Цвет</TableHead>
										<TableHead>IMEI</TableHead>
										<TableHead>Ячейка</TableHead>
										<TableHead>Статус</TableHead>
										<TableHead className="text-right">Действия</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data?.items.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={7}
												className="text-center py-8 text-muted-foreground"
											>
												Нет данных. Создайте первую запись.
											</TableCell>
										</TableRow>
									) : (
										data?.items.map((phone) => (
											<TableRow key={phone.id}>
												<TableCell className="font-medium">
													<div>{phone.owner_full_name || "—"}</div>
													{phone.owner_rank && (
														<div className="text-xs text-muted-foreground">
															{phone.owner_rank}
														</div>
													)}
												</TableCell>
												<TableCell>{phone.model || "—"}</TableCell>
												<TableCell>{phone.color || "—"}</TableCell>
												<TableCell>
													<div className="text-xs">
														{phone.imei_1 && <div>IMEI 1: {phone.imei_1}</div>}
														{phone.imei_2 && <div>IMEI 2: {phone.imei_2}</div>}
														{!phone.imei_1 && !phone.imei_2 && "—"}
													</div>
												</TableCell>
												<TableCell>{phone.storage_location || "—"}</TableCell>
												<TableCell>{getStatusBadge(phone.status)}</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-2">
														<Button size="sm" variant="outline" asChild>
															<Link href={`/phones/${phone.id}`}>Открыть</Link>
														</Button>
														<Button
															size="sm"
															variant="destructive"
															disabled={deleteMutation.isPending}
															onClick={() => {
																if (confirm(`Удалить телефон?`)) {
																	deleteMutation.mutate(phone.id);
																}
															}}
														>
															{deleteMutation.isPending
																? "Удаление..."
																: "Удалить"}
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
