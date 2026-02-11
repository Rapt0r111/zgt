"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
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

	const currentPhones =
		activeTab === "checkin"
			? issuedPhones?.items || []
			: submittedPhones?.items || [];
	const isLoading =
		activeTab === "checkin" ? isLoadingIssued : isLoadingSubmitted;
	const notSubmittedCount = statusReport?.phones_not_submitted.length || 0;

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-5xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/phones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<h1 className="text-3xl font-bold mb-6">
					Массовая сдача/выдача телефонов
				</h1>

				{/* Статистика */}
				{statusReport && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<Card>
							<CardContent className="pt-6">
								<div className="text-2xl font-bold">
									{statusReport.total_phones}
								</div>
								<div className="text-sm text-muted-foreground">
									Всего телефонов
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="text-2xl font-bold text-green-600">
									{statusReport.checked_in}
								</div>
								<div className="text-sm text-muted-foreground">Сдано</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="text-2xl font-bold text-orange-600">
									{statusReport.checked_out}
								</div>
								<div className="text-sm text-muted-foreground">Выдано</div>
							</CardContent>
						</Card>
					</div>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Операция</CardTitle>
					</CardHeader>

					<CardContent>
						<Tabs
							value={activeTab}
							onValueChange={(val) => {
								setActiveTab(val);
								setSelectedPhones([]);
							}}
						>
							<TabsList className="grid w-full grid-cols-2 mb-6">
								<TabsTrigger value="checkin">
									Вечерняя сдача
									{notSubmittedCount > 0 && (
										<Badge variant="destructive" className="ml-2">
											{notSubmittedCount}
										</Badge>
									)}
								</TabsTrigger>
								<TabsTrigger value="checkout">Утренняя выдача</TabsTrigger>
							</TabsList>

							{/* Вечерняя сдача */}
							<TabsContent value="checkin" className="space-y-4">
								{notSubmittedCount > 0 && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											Не сдано телефонов: {notSubmittedCount}
										</AlertDescription>
									</Alert>
								)}

								{isLoading ? (
									<div className="text-center py-8">Загрузка...</div>
								) : currentPhones.length === 0 ? (
									<Alert>
										<CheckCircle2 className="h-4 w-4" />
										<AlertDescription>Все телефоны сданы!</AlertDescription>
									</Alert>
								) : (
									<>
										<div className="flex items-center justify-between mb-4">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleSelectAll(currentPhones)}
											>
												{selectedPhones.length === currentPhones.length
													? "Снять всё"
													: "Выбрать всё"}
											</Button>
											<span className="text-sm text-muted-foreground">
												Выбрано: {selectedPhones.length} из{" "}
												{currentPhones.length}
											</span>
										</div>

										<div className="space-y-2 max-h-96 overflow-y-auto">
											{currentPhones.map((phone) => (
												<div
													key={phone.id}
													role="button"
													tabIndex={0}
													className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
														selectedPhones.includes(phone.id)
															? "bg-primary/5 border-primary"
															: "hover:bg-slate-50"
													}`}
													onClick={() => handleTogglePhone(phone.id)}
												>
													<Checkbox
														checked={selectedPhones.includes(phone.id)}
														onCheckedChange={() => handleTogglePhone(phone.id)}
													/>
													<div className="flex-1">
														<div className="font-medium">
															{phone.owner_full_name}
														</div>
														<div className="text-sm text-muted-foreground">
															{phone.model || "Модель не указана"} •{" "}
															{phone.storage_location || "Ячейка не указана"}
														</div>
													</div>
													<Badge variant="outline">{phone.status}</Badge>
												</div>
											))}
										</div>

										<Button
											className="w-full"
											size="lg"
											disabled={
												selectedPhones.length === 0 || checkinMutation.isPending
											}
											onClick={handleSubmit}
										>
											{checkinMutation.isPending
												? "Приём..."
												: `Принять ${selectedPhones.length} телефонов`}
										</Button>
									</>
								)}
							</TabsContent>

							{/* Утренняя выдача */}
							<TabsContent value="checkout" className="space-y-4">
								{isLoading ? (
									<div className="text-center py-8">Загрузка...</div>
								) : currentPhones.length === 0 ? (
									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											Нет телефонов для выдачи
										</AlertDescription>
									</Alert>
								) : (
									<>
										<div className="flex items-center justify-between mb-4">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleSelectAll(currentPhones)}
											>
												{selectedPhones.length === currentPhones.length
													? "Снять всё"
													: "Выбрать всё"}
											</Button>
											<span className="text-sm text-muted-foreground">
												Выбрано: {selectedPhones.length} из{" "}
												{currentPhones.length}
											</span>
										</div>

										<div className="space-y-2 max-h-96 overflow-y-auto">
											{currentPhones.map((phone) => (
												<div
													key={phone.id}
													className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
														selectedPhones.includes(phone.id)
															? "bg-primary/5 border-primary"
															: "hover:bg-slate-50"
													}`}
													onClick={() => handleTogglePhone(phone.id)}
												>
													<Checkbox
														checked={selectedPhones.includes(phone.id)}
														onCheckedChange={() => handleTogglePhone(phone.id)}
													/>
													<div className="flex-1">
														<div className="font-medium">
															{phone.owner_full_name}
														</div>
														<div className="text-sm text-muted-foreground">
															{phone.model || "Модель не указана"} •{" "}
															{phone.storage_location || "Ячейка не указана"}
														</div>
													</div>
													<Badge variant="secondary">{phone.status}</Badge>
												</div>
											))}
										</div>

										<Button
											className="w-full"
											size="lg"
											disabled={
												selectedPhones.length === 0 ||
												checkoutMutation.isPending
											}
											onClick={handleSubmit}
										>
											{checkoutMutation.isPending
												? "Выдача..."
												: `Выдать ${selectedPhones.length} телефонов`}
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
