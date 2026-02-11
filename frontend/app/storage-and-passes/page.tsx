"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	CreditCard,
	Plus,
	Search,
	Trash2,
	UsbIcon,
} from "lucide-react";
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
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";

export default function StorageAndPassesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState("all");

	const { data, isLoading } = useQuery({
		queryKey: ["storage-and-passes", search, activeTab],
		queryFn: () =>
			storageAndPassesApi.getList({
				search: search || undefined,
				asset_type: activeTab === "all" ? undefined : activeTab,
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: storageAndPassesApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			toast.success("Актив удалён");
		},
		onError: () => {
			toast.error("Ошибка при удалении");
		},
	});

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			"default" | "secondary" | "destructive" | "outline"
		> = {
			in_use: "default",
			stock: "secondary",
			broken: "destructive",
			lost: "outline",
		};
		const labels: Record<string, string> = {
			in_use: "Используется",
			stock: "На складе",
			broken: "Сломан",
			lost: "Утерян",
		};
		return (
			<Badge variant={variants[status] || "default"}>
				{labels[status] || status}
			</Badge>
		);
	};

	const getAssetIcon = (type: string) => {
		return type === "flash_drive" ? (
			<UsbIcon className="h-5 w-5 text-blue-600" />
		) : (
			<CreditCard className="h-5 w-5 text-green-600" />
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
						<h1 className="text-3xl font-bold">Носители и пропуска</h1>
						<Button asChild>
							<Link href="/storage-and-passes/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить
							</Link>
						</Button>
					</div>
				</div>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>Поиск</CardTitle>
							<div className="text-sm text-muted-foreground">
								Всего: {data?.total || 0}
							</div>
						</div>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по серийному номеру, модели..."
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
								<TabsTrigger value="flash_drive">
									<UsbIcon className="mr-2 h-4 w-4" />
									Флешки
								</TabsTrigger>
								<TabsTrigger value="electronic_pass">
									<CreditCard className="mr-2 h-4 w-4" />
									Пропуска
								</TabsTrigger>
							</TabsList>
						</Tabs>

						{isLoading ? (
							<div className="text-center py-8">Загрузка...</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-12">Тип</TableHead>
										<TableHead>Серийный номер</TableHead>
										<TableHead>Модель</TableHead>
										<TableHead>Характеристики</TableHead>
										<TableHead>Владелец</TableHead>
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
												Нет данных
											</TableCell>
										</TableRow>
									) : (
										data?.items.map((asset) => (
											<TableRow key={asset.id}>
												<TableCell>{getAssetIcon(asset.asset_type)}</TableCell>
												<TableCell className="font-mono font-medium">
													{asset.serial_number}
												</TableCell>
												<TableCell>
													<div className="text-sm">
														{asset.manufacturer && (
															<div className="font-semibold">
																{asset.manufacturer}
															</div>
														)}
														<div className="text-muted-foreground">
															{asset.model || "—"}
														</div>
													</div>
												</TableCell>
												<TableCell className="text-sm">
													{asset.asset_type === "flash_drive" ? (
														<div>Объём: {asset.capacity_gb} ГБ</div>
													) : (
														<div>Уровень доступа: {asset.access_level}</div>
													)}
												</TableCell>
												<TableCell>
													{asset.assigned_to_name ? (
														<div className="text-sm">
															<div className="font-medium">
																{asset.assigned_to_name}
															</div>
															{asset.assigned_to_rank && (
																<div className="text-muted-foreground text-xs">
																	{asset.assigned_to_rank}
																</div>
															)}
														</div>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell>{getStatusBadge(asset.status)}</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-2">
														<Button size="sm" variant="outline" asChild>
															<Link href={`/storage-and-passes/${asset.id}`}>
																Открыть
															</Link>
														</Button>
														<Button
															size="sm"
															variant="destructive"
															disabled={deleteMutation.isPending}
															onClick={() => {
																if (
																	confirm(`Удалить ${asset.serial_number}?`)
																) {
																	deleteMutation.mutate(asset.id);
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
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
