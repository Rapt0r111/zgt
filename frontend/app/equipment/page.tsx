"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equipmentApi } from "@/lib/api/equipment";

const EQUIPMENT_TYPES = ["АРМ", "Ноутбук", "Сервер", "Принтер", "Другое"];
const _STATUSES = ["В работе", "На складе", "В ремонте", "Списан"];

const STATUS_VARIANTS = {
	"В работе": "default",
	"На складе": "secondary",
	"В ремонте": "outline",
	Списан: "destructive",
} as const;

const SEAL_VARIANTS = {
	Исправна: "default",
	Повреждена: "destructive",
	Отсутствует: "outline",
} as const;

export default function EquipmentPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState("all");
	const [typeFilter, setTypeFilter] = useState("all");

	const { data, isLoading } = useQuery({
		queryKey: ["equipment", search, activeTab, typeFilter],
		queryFn: () =>
			equipmentApi.getList({
				search: search || undefined,
				status: activeTab === "all" ? undefined : activeTab,
				equipment_type: typeFilter === "all" ? undefined : typeFilter,
			}),
	});

	const { data: stats } = useQuery({
		queryKey: ["equipment-stats"],
		queryFn: () => equipmentApi.getStatistics(),
	});

	const deleteMutation = useMutation({
		mutationFn: equipmentApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipment"] });
			queryClient.invalidateQueries({ queryKey: ["equipment-stats"] });
			toast.success("Техника удалена");
		},
		onError: () => {
			toast.error("Ошибка при удалении");
		},
	});

	return (
		<div className="min-h-screen bg-slate-50 p-4 md:p-8">
			<div className="max-w-[1600px] mx-auto">
				<div className="mb-6">
					<Button variant="ghost" asChild className="mb-4">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к панели
						</Link>
					</Button>

					<div className="flex justify-between items-center mb-4">
						<h1 className="text-2xl md:text-3xl font-bold">
							Вычислительная техника
						</h1>
						<Button asChild size="sm">
							<Link href="/equipment/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить
							</Link>
						</Button>
					</div>

					{stats && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
							<Card>
								<CardContent className="pt-4 pb-4 px-4 text-center md:text-left">
									<div className="text-xl font-bold">
										{stats.total_equipment}
									</div>
									<div className="text-xs text-muted-foreground">
										Всего техники
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-4 pb-4 px-4 text-center md:text-left">
									<div className="text-xl font-bold text-green-600">
										{stats.by_status["В работе"] || 0}
									</div>
									<div className="text-xs text-muted-foreground">В работе</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-4 pb-4 px-4 text-center md:text-left">
									<div className="text-xl font-bold text-blue-600">
										{stats.by_status["На складе"] || 0}
									</div>
									<div className="text-xs text-muted-foreground">На складе</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-4 pb-4 px-4 text-center md:text-left">
									<div className="text-xl font-bold text-red-600">
										{stats.seal_issues}
									</div>
									<div className="text-xs text-muted-foreground">
										Проблемы с пломбами
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</div>

				<Card className="overflow-hidden">
					<CardHeader className="p-4 space-y-4">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">Поиск и фильтры</CardTitle>
							<div className="text-xs text-muted-foreground">
								Найдено: {data?.total || 0}
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<div className="relative flex-1 min-w-[200px]">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Инв. номер, модель, место..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 h-9 text-sm"
								/>
							</div>
							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger className="w-[140px] h-9 text-sm">
									<SelectValue placeholder="Тип техники" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Все типы</SelectItem>
									{EQUIPMENT_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="w-full"
						>
							<TabsList className="h-9 w-full justify-start overflow-x-auto">
								<TabsTrigger value="all" className="text-xs">
									Все
								</TabsTrigger>
								<TabsTrigger value="В работе" className="text-xs">
									В работе
								</TabsTrigger>
								<TabsTrigger value="На складе" className="text-xs">
									На складе
								</TabsTrigger>
								<TabsTrigger value="В ремонте" className="text-xs">
									В ремонте
								</TabsTrigger>
								<TabsTrigger value="Списан" className="text-xs">
									Списан
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</CardHeader>

					<CardContent className="p-0 border-t">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="bg-slate-50/50">
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10 w-[100px]">
											Инв. №
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											Тип
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											Модель
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											S/N
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											МНИ S/N
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											Владелец
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											Место
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											Пломба
										</TableHead>
										<TableHead className="text-[11px] uppercase font-bold px-2 h-10">
											Статус
										</TableHead>
										<TableHead className="text-right text-[11px] uppercase font-bold px-2 h-10">
											Действия
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										<TableRow>
											<TableCell colSpan={10} className="text-center py-8">
												Загрузка...
											</TableCell>
										</TableRow>
									) : data?.items.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={10}
												className="text-center py-8 text-muted-foreground"
											>
												Нет данных.
											</TableCell>
										</TableRow>
									) : (
										data?.items.map((equipment) => (
											<TableRow
												key={equipment.id}
												className="hover:bg-slate-50/50"
											>
												<TableCell className="font-medium text-xs px-2 py-2">
													{equipment.inventory_number}
												</TableCell>
												<TableCell className="text-xs px-2 py-2">
													{equipment.equipment_type}
												</TableCell>
												<TableCell
													className="text-xs px-2 py-2 max-w-[150px] truncate"
													title={`${equipment.manufacturer || ""} ${equipment.model || ""}`}
												>
													<span className="font-semibold">
														{equipment.manufacturer}
													</span>{" "}
													{equipment.model || "—"}
												</TableCell>
												<TableCell className="text-[10px] font-mono px-2 py-2">
													{equipment.serial_number || "—"}
												</TableCell>
												<TableCell className="text-[10px] font-mono px-2 py-2">
													{equipment.mni_serial_number || "—"}
												</TableCell>
												<TableCell className="text-xs px-2 py-2 max-w-[120px] truncate leading-tight">
													{equipment.current_owner_name ? (
														<div>
															<div className="font-medium truncate">
																{equipment.current_owner_name}
															</div>
															{equipment.current_owner_rank && (
																<div className="text-[9px] text-muted-foreground truncate">
																	{equipment.current_owner_rank}
																</div>
															)}
														</div>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell className="text-xs px-2 py-2 max-w-[100px] truncate">
													{equipment.current_location || "—"}
												</TableCell>
												<TableCell className="px-2 py-2">
													{equipment.seal_number ? (
														<div className="flex flex-col items-start gap-0.5">
															<span className="text-[9px] font-mono font-bold leading-none">
																{equipment.seal_number}
															</span>
															<Badge
																variant={
																	SEAL_VARIANTS[
																		equipment.seal_status as keyof typeof SEAL_VARIANTS
																	] || "outline"
																}
																className="text-[10px] px-1 py-0 h-4"
															>
																{equipment.seal_status}
															</Badge>
														</div>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell className="px-2 py-2">
													<Badge
														variant={
															STATUS_VARIANTS[
																equipment.status as keyof typeof STATUS_VARIANTS
															] || "default"
														}
														className="whitespace-nowrap text-[10px] px-1.5 py-0"
													>
														{equipment.status}
													</Badge>
												</TableCell>
												<TableCell className="text-right px-2 py-2">
													<div className="flex justify-end gap-1">
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7"
															asChild
															title="Открыть"
														>
															<Link href={`/equipment/${equipment.id}`}>
																<Eye className="h-4 w-4" />
															</Link>
														</Button>
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
															disabled={deleteMutation.isPending}
															title="Удалить"
															onClick={() => {
																if (
																	confirm(
																		`Удалить ${equipment.inventory_number}?`,
																	)
																) {
																	deleteMutation.mutate(equipment.id);
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
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
