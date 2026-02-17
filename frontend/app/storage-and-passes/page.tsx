"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	CreditCard,
	Plus,
	Search,
	Trash2,
	UsbIcon,
	Hash,
	User as UserIcon,
	Layers,
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
		const variants: Record<string, string> = {
			in_use: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
			stock: "bg-blue-500/20 text-blue-400 border-blue-500/30",
			broken: "bg-destructive/20 text-destructive border-destructive/30",
			lost: "bg-white/5 text-muted-foreground border-white/10",
		};
		const labels: Record<string, string> = {
			in_use: "Используется",
			stock: "На складе",
			broken: "Сломан",
			lost: "Утерян",
		};
		return (
			<Badge className={`${variants[status] || ""} px-2 py-0.5 shadow-sm text-[10px] font-medium`}>
				{labels[status] || status}
			</Badge>
		);
	};

	const getAssetIcon = (type: string) => {
		return type === "flash_drive" ? (
			<UsbIcon className="h-4 w-4 text-blue-400" />
		) : (
			<CreditCard className="h-4 w-4 text-emerald-400" />
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
						<h1 className="text-3xl font-bold tracking-tight">Носители и пропуска</h1>
						<Button asChild className="gradient-primary border-0 shadow-lg px-4">
							<Link href="/storage-and-passes/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить актив
							</Link>
						</Button>
					</div>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b py-6 border-white/10 pb-6 space-y-4">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-semibold flex items-center gap-2">
								<Layers className="h-4 w-4 text-muted-foreground" />
								Реестр активов
							</CardTitle>
							<Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
								Всего: {data?.total || 0}
							</Badge>
						</div>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
								<input
									placeholder="Поиск по серийному номеру, модели..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50"
								/>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-0">
						<div className="px-6 pt-4">
							<Tabs
								value={activeTab}
								onValueChange={setActiveTab}
								className="w-full"
							>
								<TabsList className="bg-background/50 border border-white/5 p-1 w-fit">
									<TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/20 px-6">Все</TabsTrigger>
									<TabsTrigger value="flash_drive" className="text-xs data-[state=active]:bg-primary/20 px-6">
										<UsbIcon className="mr-2 h-3.5 w-3.5" />
										Флешки
									</TabsTrigger>
									<TabsTrigger value="electronic_pass" className="text-xs data-[state=active]:bg-primary/20 px-6">
										<CreditCard className="mr-2 h-3.5 w-3.5" />
										Пропуска
									</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>

						{isLoading ? (
							<div className="text-center py-20 text-muted-foreground">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
								Загрузка данных...
							</div>
						) : (
							<div className="overflow-x-auto mt-4">
								<Table>
									<TableHeader>
										<TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 w-12">Тип</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Серийный номер</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Модель / Бренд</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Характеристики</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Владелец</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
											<TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Действия</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data?.items.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={7}
													className="text-center py-20 text-muted-foreground"
												>
													Активы не найдены.
												</TableCell>
											</TableRow>
										) : (
											data?.items.map((asset) => (
												<TableRow key={asset.id} className="hover:bg-white/6 border-white/5 transition-colors group">
													<TableCell className="px-6 py-4 text-center">
														<div className="bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
															{getAssetIcon(asset.asset_type)}
														</div>
													</TableCell>
													<TableCell className="px-6 py-4 font-mono text-xs text-primary/80 group-hover:text-primary transition-colors">
														<div className="flex items-center gap-2">
															<Hash className="h-3 w-3 opacity-30" />
															{asset.serial_number}
														</div>
													</TableCell>
													<TableCell className="px-6 py-4">
														<div className="flex flex-col leading-tight">
															<span className="font-semibold text-foreground">{asset.manufacturer || "—"}</span>
															<span className="text-[11px] text-muted-foreground italic">{asset.model || "—"}</span>
														</div>
													</TableCell>
													<TableCell className="px-6 py-4">
														<div className="text-[11px] font-medium bg-white/5 w-fit px-2 py-0.5 rounded border border-white/5 text-muted-foreground group-hover:text-foreground transition-colors">
															{asset.asset_type === "flash_drive" ? (
																<span className="flex items-center gap-1.5"><UsbIcon className="h-3 w-3" /> {asset.capacity_gb} ГБ</span>
															) : (
																<span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Уровень: {asset.access_level}</span>
															)}
														</div>
													</TableCell>
													<TableCell className="px-6 py-4 leading-tight">
														{asset.assigned_to_name ? (
															<div className="flex flex-col">
																<div className="flex items-center gap-1.5 text-xs font-medium">
																	<UserIcon className="h-3.5 w-3.5 opacity-40" />
																	{asset.assigned_to_name}
																</div>
																{asset.assigned_to_rank && (
																	<div className="text-[10px] text-muted-foreground pl-5 mt-0.5 opacity-80">
																		{asset.assigned_to_rank}
																	</div>
																)}
															</div>
														) : (
															<span className="text-muted-foreground/50 text-xs">—</span>
														)}
													</TableCell>
													<TableCell className="px-6 py-4 text-center">
														{getStatusBadge(asset.status)}
													</TableCell>
													<TableCell className="px-6 py-4 text-right">
														<div className="flex justify-end gap-2">
															<Button 
																size="sm" 
																variant="ghost" 
																className="h-8 hover:bg-white/10 hover:text-primary transition-colors"
																asChild
															>
																<Link href={`/storage-and-passes/${asset.id}`}>Открыть</Link>
															</Button>
															<Button
																size="sm"
																variant="ghost"
																className="h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
																disabled={deleteMutation.isPending}
																onClick={() => {
																	if (confirm(`Удалить ${asset.serial_number}?`)) {
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
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}