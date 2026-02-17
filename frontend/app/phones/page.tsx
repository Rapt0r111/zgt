"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Plus, Search, XCircle, Smartphone, Hash, Box, User as UserIcon, History } from "lucide-react";
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
			<Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2 py-0.5 shadow-sm text-[10px]">
				<CheckCircle2 className="h-3 w-3" />
				Выдан
			</Badge>
		) : (
			<Badge variant="secondary" className="gap-1 bg-white/5 text-muted-foreground border-white/10 px-2 py-0.5 shadow-sm text-[10px]">
				<XCircle className="h-3 w-3" />
				Сдан
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
						<h1 className="text-3xl font-bold tracking-tight">Средства связи</h1>
						<div className="flex gap-3">
							<Button variant="outline" asChild className="border-white/10 bg-white/5 hover:bg-white/10 transition-all">
								<Link href="/phones/batch" className="flex items-center">
                                    <History className="mr-2 h-4 w-4" />
                                    Массовая сдача/выдача
                                </Link>
							</Button>
							<Button asChild className="gradient-primary border-0 shadow-lg px-4">
								<Link href="/phones/create">
									<Plus className="mr-2 h-4 w-4" />
									Добавить
								</Link>
							</Button>
						</div>
					</div>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 py-6 border-b border-white/10 pb-6 space-y-4">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-semibold flex items-center gap-2">
								<Smartphone className="h-4 w-4 text-muted-foreground" />
								Реестр устройств
							</CardTitle>
							<Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
								Всего устройств: {data?.total || 0}
							</Badge>
						</div>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по модели, IMEI, владельцу..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 bg-background/50 border-white/10 focus:border-primary/50 transition-all"
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
                                    <TabsTrigger value="issued" className="text-xs data-[state=active]:bg-primary/20 px-6">Выдан</TabsTrigger>
                                    <TabsTrigger value="submitted" className="text-xs data-[state=active]:bg-primary/20 px-6">Сдан</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

						{isLoading ? (
							<div className="text-center py-20 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                Загрузка базы данных...
                            </div>
						) : (
							<div className="overflow-x-auto mt-4">
								<Table>
									<TableHeader>
										<TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Владелец</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Модель / Цвет</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Идентификация (IMEI)</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Ячейка</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
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
													Нет данных по средствам связи.
												</TableCell>
											</TableRow>
										) : (
											data?.items.map((phone) => (
												<TableRow key={phone.id} className="hover:bg-white/6 border-white/5 transition-colors group">
													<TableCell className="px-6 py-4">
														<div className="flex flex-col">
															<div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                                <UserIcon className="h-3.5 w-3.5 opacity-40" />
                                                                {phone.owner_full_name || "—"}
                                                            </div>
															{phone.owner_rank && (
																<div className="text-[10px] text-muted-foreground pl-5 mt-0.5 opacity-80">
																	{phone.owner_rank}
																</div>
															)}
														</div>
													</TableCell>
													<TableCell className="px-6 py-4">
														<div className="flex flex-col leading-tight">
                                                            <span className="font-semibold text-foreground">{phone.model || "—"}</span>
                                                            <span className="text-[11px] text-muted-foreground uppercase">{phone.color || "—"}</span>
                                                        </div>
													</TableCell>
													<TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
														<div className="flex flex-col gap-0.5">
															{phone.imei_1 && <div className="flex items-center gap-1"><Hash className="h-3 w-3 opacity-30" /> {phone.imei_1}</div>}
															{phone.imei_2 && <div className="flex items-center gap-1"><Hash className="h-3 w-3 opacity-30" /> {phone.imei_2}</div>}
															{!phone.imei_1 && !phone.imei_2 && "—"}
														</div>
													</TableCell>
													<TableCell className="px-6 py-4 text-center">
														<div className="inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5 font-mono text-xs text-primary/80 group-hover:text-primary transition-colors">
                                                            <Box className="h-3 w-3 opacity-40" />
                                                            {phone.storage_location || "—"}
                                                        </div>
													</TableCell>
													<TableCell className="px-6 py-4 text-center">
														{getStatusBadge(phone.status)}
													</TableCell>
													<TableCell className="px-6 py-4 text-right">
														<div className="flex justify-end gap-2">
															<Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className="h-8 hover:bg-white/10 hover:text-primary transition-colors"
                                                                asChild
                                                            >
																<Link href={`/phones/${phone.id}`}>Открыть</Link>
															</Button>
															<Button
																size="sm"
																variant="ghost"
                                                                className="h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
																disabled={deleteMutation.isPending}
																onClick={() => {
																	if (confirm(`Удалить телефон?`)) {
																		deleteMutation.mutate(phone.id);
																	}
																}}
															>
																{deleteMutation.isPending
																	? "..."
																	: "Удалить"}
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