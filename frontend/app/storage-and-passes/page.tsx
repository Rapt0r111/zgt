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
	Activity,
	Package,
	X,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
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

// Маппинг для динамических заголовков
const assetLabels = {
	all: "активов",
	flash_drive: "флешек",
	electronic_pass: "пропусков",
};

export default function StorageAndPassesPage() {
	const queryClient = useQueryClient();
	
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [activeTab, setActiveTab] = useState("all");

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 400);
		return () => clearTimeout(timer);
	}, [search]);

	const filterParams = useMemo(() => ({
		search: debouncedSearch.trim() || undefined,
		asset_type: activeTab === "all" ? undefined : activeTab,
	}), [debouncedSearch, activeTab]);

	const { data, isLoading } = useQuery({
		queryKey: ["storage-and-passes", filterParams],
		queryFn: () => storageAndPassesApi.getList(filterParams),
	});

	const { data: stats } = useQuery({
		queryKey: ["storage-stats", filterParams],
		queryFn: () => storageAndPassesApi.getStatistics(filterParams),
	});

	const deleteMutation = useMutation({
		mutationFn: storageAndPassesApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			queryClient.invalidateQueries({ queryKey: ["storage-stats"] });
			toast.success("Актив удалён");
		},
	});

	const totalItems = stats?.total_assets || 0;
	const inUse = stats?.by_status?.in_use || 0;
	const inStock = stats?.by_status?.stock || 0;
	const problematic = (stats?.by_status?.broken || 0) + (stats?.by_status?.lost || 0);

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
				{/* Header */}
				<div className="mb-6">
					<Button variant="ghost" asChild className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к панели
						</Link>
					</Button>

					<div className="flex justify-between items-center mb-6">
						<h1 className="text-3xl font-bold tracking-tight text-white">Носители и пропуска</h1>
						<Button asChild className="gradient-primary border-0 shadow-lg px-4 hover:opacity-90 transition-opacity">
							<Link href="/storage-and-passes/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить актив
							</Link>
						</Button>
					</div>
				</div>

				{/* Блок статистики */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<Card className={`glass-elevated transition-all duration-300 ${activeTab !== 'all' ? 'border-primary/40 ring-1 ring-primary/20' : 'border-white/10'}`}>
						<CardContent className="pt-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 transition-all">
										Всего {assetLabels[activeTab as keyof typeof assetLabels]}
									</p>
									<p className="text-3xl font-bold tracking-tight">{totalItems}</p>
								</div>
								<div className={`p-2 rounded-lg transition-colors ${activeTab === 'flash_drive' ? 'bg-blue-500/20' : activeTab === 'electronic_pass' ? 'bg-emerald-500/20' : 'bg-indigo-500/10'}`}>
									<Layers className={`h-5 w-5 ${activeTab === 'flash_drive' ? 'text-blue-400' : activeTab === 'electronic_pass' ? 'text-emerald-400' : 'text-indigo-400'}`} />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-elevated border-white/10">
						<CardContent className="pt-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Выдано</p>
									<p className="text-3xl font-bold text-emerald-400">{inUse}</p>
								</div>
								<div className="p-2 bg-emerald-500/10 rounded-lg">
									<UserIcon className="h-5 w-5 text-emerald-400" />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-elevated border-white/10">
						<CardContent className="pt-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">На складе</p>
									<p className="text-3xl font-bold text-blue-400">{inStock}</p>
								</div>
								<div className="p-2 bg-blue-500/10 rounded-lg">
									<Package className="h-5 w-5 text-blue-400" />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-elevated border-white/10">
						<CardContent className="pt-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Проблемные</p>
									<p className="text-3xl font-bold text-rose-400">{problematic}</p>
								</div>
								<div className="p-2 bg-rose-500/10 rounded-lg">
									<Activity className="h-5 w-5 text-rose-400" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Основной контент */}
				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b py-6 border-white/10 space-y-4">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-semibold flex items-center gap-2">
								<Search className="h-4 w-4 text-muted-foreground" />
								Поиск активов
							</CardTitle>
							<div className="flex items-center gap-3">
								{search && (
									<Button 
										variant="ghost" 
										size="sm" 
										onClick={() => setSearch("")}
										className="h-8 text-xs text-muted-foreground hover:text-white"
									>
										<X className="mr-2 h-3 w-3" /> Сбросить поиск
									</Button>
								)}
								<Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
									Найдено: {totalItems}
								</Badge>
							</div>
						</div>
						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Поиск по серийному номеру, производителю или модели..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 bg-background/50 border-white/10 focus:ring-primary/20 transition-all"
							/>
						</div>
					</CardHeader>

					<CardContent className="p-0">
						<div className="px-6 py-4 border-b border-white/5 bg-white/2">
							<Tabs
								value={activeTab}
								onValueChange={setActiveTab}
								className="w-full"
							>
								<TabsList className="bg-background/50 border border-white/10 p-1 w-fit">
									<TabsTrigger 
										value="all" 
										className="text-xs px-6 data-[state=active]:bg-white/20 data-[state=active]:text-primary data-[state=active]:ring-1 data-[state=active]:ring-white/30 transition-all"
									>
										Все активы
									</TabsTrigger>
									<TabsTrigger 
										value="flash_drive" 
										className="text-xs px-6 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-blue-500/30 transition-all"
									>
										<UsbIcon className="mr-2 h-3.5 w-3.5" />
										Флешки
									</TabsTrigger>
									<TabsTrigger 
										value="electronic_pass" 
										className="text-xs px-6 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:ring-1 data-[state=active]:ring-emerald-500/30 transition-all"
									>
										<CreditCard className="mr-2 h-3.5 w-3.5" />
										Пропуска
									</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>

						<div className="relative">
							{isLoading && (
								<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex items-center justify-center h-100">
									<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
								</div>
							)}

							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 w-12">Тип</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">S/N</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Модель / Бренд</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Характеристики</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Владелец</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
											<TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Действия</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{!isLoading && data?.items.length === 0 ? (
											<TableRow>
												<TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">
													Ничего не найдено по вашему запросу...
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
															<span className="font-semibold text-foreground">{asset.manufacturer || "–"}</span>
															<span className="text-[11px] text-muted-foreground italic">{asset.model || "–"}</span>
														</div>
													</TableCell>
													<TableCell className="px-6 py-4">
														<div className="text-[11px] font-medium bg-white/5 w-fit px-2 py-0.5 rounded border border-white/5 text-muted-foreground group-hover:text-white transition-colors">
															{asset.asset_type === "flash_drive" ? (
																<span className="flex items-center gap-1.5"><UsbIcon className="h-3 w-3 text-blue-400" /> {asset.capacity_gb} ГБ</span>
															) : (
																<span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3 text-emerald-400" /> Уровень: {asset.access_level}</span>
															)}
														</div>
													</TableCell>
													<TableCell className="px-6 py-4 leading-tight">
														{asset.assigned_to_name ? (
															<div className="flex flex-col">
																<div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
																	<UserIcon className="h-3.5 w-3.5 opacity-40 text-primary" />
																	{asset.assigned_to_name}
																</div>
																{asset.assigned_to_rank && (
																	<div className="text-[10px] text-muted-foreground pl-5 mt-0.5 opacity-80">
																		{asset.assigned_to_rank}
																	</div>
																)}
															</div>
														) : (
															<span className="text-muted-foreground/50 text-xs">–</span>
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
																	if (confirm(`Удалить актив ${asset.serial_number}?`)) {
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
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}