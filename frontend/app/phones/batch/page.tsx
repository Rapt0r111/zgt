"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2, Smartphone, Check, RotateCcw, LayoutGrid, ListChecks } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { phonesApi } from "@/lib/api/phones";
import type { Phone } from "@/types/phone";

export default function BatchPhonePage() {
	const queryClient = useQueryClient();
	const [selectedPhones, setSelectedPhones] = useState<number[]>([]);
	const [activeTab, setActiveTab] = useState("checkin");

	// Для вечерней сдачи - получаем телефоны со статусом "Выдан"
	const { data: issuedPhones, isLoading: isLoadingIssued } = useQuery({
		queryKey: ["phones", "issued"],
		queryFn: () => phonesApi.getList({ status: "Выдан", limit: 1000 }),
	});

	// Для утренней выдачи - получаем телефоны со статусом "Сдан"
	const { data: submittedPhones, isLoading: isLoadingSubmitted } = useQuery({
		queryKey: ["phones", "submitted"],
		queryFn: () => phonesApi.getList({ status: "Сдан", limit: 1000 }),
	});

	// Отчёт по статусам
	const { data: statusReport } = useQuery({
		queryKey: ["phones", "status-report"],
		queryFn: () => phonesApi.getStatusReport(),
	});

	const checkinMutation = useMutation({
		mutationFn: phonesApi.batchCheckin,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["phones"] });
			setSelectedPhones([]);
			toast.success(data.message);
		},
		onError: () => {
			toast.error("Ошибка при приёме телефонов");
		},
	});

	const checkoutMutation = useMutation({
		mutationFn: phonesApi.batchCheckout,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["phones"] });
			setSelectedPhones([]);
			toast.success(data.message);
		},
		onError: () => {
			toast.error("Ошибка при выдаче телефонов");
		},
	});

	const handleTogglePhone = (phoneId: number) => {
		setSelectedPhones((prev) =>
			prev.includes(phoneId)
				? prev.filter((id) => id !== phoneId)
				: [...prev, phoneId],
		);
	};

	const handleSelectAll = (phones: Phone[]) => {
		if (selectedPhones.length === phones.length) {
			setSelectedPhones([]);
		} else {
			setSelectedPhones(phones.map((p) => p.id));
		}
	};

	const handleSubmit = () => {
		if (selectedPhones.length === 0) {
			toast.error("Выберите хотя бы один телефон");
			return;
		}

		if (activeTab === "checkin") {
			checkinMutation.mutate(selectedPhones);
		} else {
			checkoutMutation.mutate(selectedPhones);
		}
	};

	const getPhoneButtonClassName = (phoneId: number) => {
		const baseClassName =
			"flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all text-left w-full group";

		return selectedPhones.includes(phoneId)
			? `${baseClassName} border-primary/50 bg-primary/10 ring-1 ring-primary/20`
			: `${baseClassName} border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10`;
	};

	const currentPhones =
		activeTab === "checkin"
			? issuedPhones?.items || []
			: submittedPhones?.items || [];
	const isLoading =
		activeTab === "checkin" ? isLoadingIssued : isLoadingSubmitted;
	const notSubmittedCount = statusReport?.phones_not_submitted.length || 0;

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-5xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/phones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight">Массовая обработка</h1>
					<p className="text-muted-foreground mt-1">Прием и выдача мобильных устройств по списку</p>
				</div>

				{/* Статистика */}
				{statusReport && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
						<Card className="glass-elevated border-white/10">
							<CardContent className="pt-6 pb-6">
								<div className="text-2xl font-bold">{statusReport.total_phones}</div>
								<div className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">Всего устройств</div>
							</CardContent>
						</Card>
						<Card className="glass-elevated border-white/10">
							<CardContent className="pt-6 pb-6">
								<div className="text-2xl font-bold text-emerald-400">
									{statusReport.checked_in}
								</div>
								<div className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">В хранилище (сдано)</div>
							</CardContent>
						</Card>
						<Card className="glass-elevated border-white/10">
							<CardContent className="pt-6 pb-6">
								<div className="text-2xl font-bold text-orange-400">
									{statusReport.checked_out}
								</div>
								<div className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">На руках (выдано)</div>
							</CardContent>
						</Card>
					</div>
				)}

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b border-white/10 py-6">
						<CardTitle className="text-lg font-semibold flex items-center gap-2">
							<ListChecks className="h-5 w-5 text-primary" />
							Выбор операции
						</CardTitle>
					</CardHeader>

					<CardContent className="p-8">
						<Tabs
							value={activeTab}
							onValueChange={(val) => {
								setActiveTab(val);
								setSelectedPhones([]);
							}}
							className="space-y-8"
						>
							<TabsList className="grid w-full grid-cols-2 bg-background/50 border border-white/5 p-1">
								<TabsTrigger value="checkin" className="data-[state=active]:bg-primary/20">
									<RotateCcw className="h-4 w-4 mr-2" />
									Вечерняя сдача
									{notSubmittedCount > 0 && (
										<Badge variant="destructive" className="ml-2 bg-destructive/80">
											{notSubmittedCount}
										</Badge>
									)}
								</TabsTrigger>
								<TabsTrigger value="checkout" className="data-[state=active]:bg-primary/20">
									<Smartphone className="h-4 w-4 mr-2" />
									Утренняя выдача
								</TabsTrigger>
							</TabsList>

							{/* Вечерняя сдача */}
							<TabsContent value="checkin" className="space-y-6 outline-none">
								{notSubmittedCount > 0 && (
									<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription className="font-medium">
											Внимание! {notSubmittedCount} военнослужащих еще не сдали свои устройства.
										</AlertDescription>
									</Alert>
								)}

								{isLoading ? (
									<div className="text-center py-20 text-muted-foreground">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
										Загрузка списка...
									</div>
								) : currentPhones.length === 0 ? (
									<div className="py-20 text-center bg-emerald-500/5 rounded-xl border border-dashed border-emerald-500/20">
										<CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
										<div className="text-lg font-medium text-emerald-400">Все телефоны приняты</div>
										<div className="text-sm text-muted-foreground mt-1">На данный момент нет устройств, подлежащих сдаче</div>
									</div>
								) : (
									<>
										<div className="flex items-center justify-between pb-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleSelectAll(currentPhones)}
												className="hover:bg-white/5 text-xs h-8"
											>
												{selectedPhones.length === currentPhones.length
													? "Снять выделение"
													: "Выбрать всех"}
											</Button>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Выбрано: <span className="text-primary font-bold">{selectedPhones.length}</span> из {currentPhones.length}
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
											{currentPhones.map((phone) => (
												<button
													key={phone.id}
													type="button"
													className={getPhoneButtonClassName(phone.id)}
													onClick={() => handleTogglePhone(phone.id)}
												>
													<Checkbox
														checked={selectedPhones.includes(phone.id)}
														onCheckedChange={() => handleTogglePhone(phone.id)}
														className="border-white/20 data-[state=checked]:bg-primary"
													/>
													<div className="flex-1 min-w-0">
														<div className="font-semibold truncate">
															{phone.owner_full_name}
														</div>
														<div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
															<LayoutGrid className="h-3 w-3 opacity-50" />
															{phone.storage_location || "Ячейка не указана"}
															<span className="opacity-30">•</span>
															{phone.model || "Модель не указана"}
														</div>
													</div>
													<Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] uppercase font-bold text-orange-400">
														{phone.status}
													</Badge>
												</button>
											))}
										</div>

										<Button
											className="w-full gradient-primary border-0 shadow-lg py-6 text-lg font-bold"
											disabled={
												selectedPhones.length === 0 || checkinMutation.isPending
											}
											onClick={handleSubmit}
										>
											{checkinMutation.isPending ? (
												<div className="flex items-center gap-2">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
													Выполняется прием...
												</div>
											) : (
												`Зафиксировать сдачу (${selectedPhones.length})`
											)}
										</Button>
									</>
								)}
							</TabsContent>

							{/* Утренняя выдача */}
							<TabsContent value="checkout" className="space-y-6 outline-none">
								{isLoading ? (
									<div className="text-center py-20 text-muted-foreground">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
										Загрузка списка...
									</div>
								) : currentPhones.length === 0 ? (
									<div className="py-20 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
										<Smartphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
										<div className="text-lg font-medium text-muted-foreground">Нет устройств для выдачи</div>
										<div className="text-sm text-muted-foreground mt-1">Все имеющиеся телефоны уже находятся на руках</div>
									</div>
								) : (
									<>
										<div className="flex items-center justify-between pb-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleSelectAll(currentPhones)}
												className="hover:bg-white/5 text-xs h-8"
											>
												{selectedPhones.length === currentPhones.length
													? "Снять выделение"
													: "Выбрать всех"}
											</Button>
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Выбрано: <span className="text-primary font-bold">{selectedPhones.length}</span> из {currentPhones.length}
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
											{currentPhones.map((phone) => (
												<button
													key={phone.id}
													type="button"
													className={getPhoneButtonClassName(phone.id)}
													onClick={() => handleTogglePhone(phone.id)}
												>
													<Checkbox
														checked={selectedPhones.includes(phone.id)}
														onCheckedChange={() => handleTogglePhone(phone.id)}
														className="border-white/20 data-[state=checked]:bg-primary"
													/>
													<div className="flex-1 min-w-0">
														<div className="font-semibold truncate">
															{phone.owner_full_name}
														</div>
														<div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
															<LayoutGrid className="h-3 w-3 opacity-50" />
															{phone.storage_location || "Ячейка не указана"}
															<span className="opacity-30">•</span>
															{phone.model || "Модель не указана"}
														</div>
													</div>
													<Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-[10px] uppercase font-bold text-emerald-400">
														{phone.status}
													</Badge>
												</button>
											))}
										</div>

										<Button
											className="w-full gradient-primary border-0 shadow-lg py-6 text-lg font-bold"
											disabled={
												selectedPhones.length === 0 ||
												checkoutMutation.isPending
											}
											onClick={handleSubmit}
										>
											{checkoutMutation.isPending ? (
												<div className="flex items-center gap-2">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
													Выполняется выдача...
												</div>
											) : (
												`Выдать устройства (${selectedPhones.length})`
											)}
										</Button>
									</>
								)}
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}