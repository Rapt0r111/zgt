"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, History, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { equipmentApi } from "@/lib/api/equipment";
import { personnelApi } from "@/lib/api/personnel";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const EQUIPMENT_TYPES = ["АРМ", "Ноутбук", "Сервер", "Принтер", "Другое"];
const STATUSES = ["В работе", "На складе", "В ремонте", "Списан"];
const STORAGE_TYPES = ["HDD", "SSD", "NVMe", "Другое"];
const SEAL_STATUSES = ["Исправна", "Повреждена", "Отсутствует"];

const equipmentSchema = z.object({
	equipment_type: z.string().min(1),
	inventory_number: z.string().min(1),
	serial_number: z.string().default(""),
	mni_serial_number: z.string().default(""),
	manufacturer: z.string().default(""),
	model: z.string().default(""),
	cpu: z.string().default(""),
	ram_gb: z.number().optional(),
	storage_type: z.string().default(""),
	storage_capacity_gb: z.number().optional(),
	has_optical_drive: z.boolean().default(false),
	has_card_reader: z.boolean().default(false),
	operating_system: z.string().default(""),
	current_owner_id: z.number().optional(),
	current_location: z.string().default(""),
	seal_number: z.string().default(""),
	seal_status: z.string().default("Исправна"),
	status: z.string().default("В работе"),
	notes: z.string().default(""),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

export default function EquipmentDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	const equipmentId = parseInt(params.id as string, 10);

	const { data: equipment, isLoading } = useQuery({
		queryKey: ["equipment", equipmentId],
		queryFn: () => equipmentApi.getById(equipmentId),
	});

	const { data: personnelData } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	const { data: movementHistory } = useQuery({
		queryKey: ["equipment", equipmentId, "movements"],
		queryFn: () => equipmentApi.getMovementHistory(equipmentId),
		enabled: !!equipment,
	});

	const { register, handleSubmit, setValue, watch, reset } = useForm({
		resolver: zodResolver(equipmentSchema),
	});

	useEffect(() => {
		if (equipment) {
			reset({
				equipment_type: equipment.equipment_type,
				inventory_number: equipment.inventory_number,
				serial_number: equipment.serial_number || "",
				mni_serial_number: equipment.mni_serial_number || "",
				manufacturer: equipment.manufacturer || "",
				model: equipment.model || "",
				cpu: equipment.cpu || "",
				ram_gb: equipment.ram_gb,
				storage_type: equipment.storage_type || "",
				storage_capacity_gb: equipment.storage_capacity_gb,
				has_optical_drive: equipment.has_optical_drive,
				has_card_reader: equipment.has_card_reader,
				operating_system: equipment.operating_system || "",
				current_owner_id: equipment.current_owner_id,
				current_location: equipment.current_location || "",
				seal_number: equipment.seal_number || "",
				seal_status: equipment.seal_status,
				status: equipment.status,
				notes: equipment.notes || "",
			});
		}
	}, [equipment, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: EquipmentFormData) =>
			equipmentApi.update(equipmentId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId] });
			queryClient.invalidateQueries({ queryKey: ["equipment"] });
			setIsEditing(false);
			setError("");
			toast.success("Данные обновлены");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка");
			toast.error("Ошибка при обновлении");
		},
	});

	const onSubmit = (data: EquipmentFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		updateMutation.mutate(cleanedData as EquipmentFormData);
	};

	const currentType = watch("equipment_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("current_owner_id");
	const currentStorageType = watch("storage_type");
	const currentSealStatus = watch("seal_status");
	const hasOpticalDrive = watch("has_optical_drive");
	const hasCardReader = watch("has_card_reader");

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Загрузка...</p>
			</div>
		);
	}

	if (!equipment) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Техника не найдена</p>
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			"default" | "secondary" | "destructive" | "outline"
		> = {
			"В работе": "default",
			"На складе": "secondary",
			"В ремонте": "outline",
			Списан: "destructive",
		};
		return <Badge variant={variants[status] || "default"}>{status}</Badge>;
	};

	const getSealBadge = (sealStatus: string) => {
		if (sealStatus === "Исправна") {
			return <Badge variant="default">Исправна</Badge>;
		} else if (sealStatus === "Повреждена") {
			return <Badge variant="destructive">Повреждена</Badge>;
		} else {
			return <Badge variant="outline">Отсутствует</Badge>;
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-6xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/equipment">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex justify-between items-start mb-6">
					<div>
						<h1 className="text-3xl font-bold">{equipment.inventory_number}</h1>
						<p className="text-muted-foreground mt-1">
							{equipment.equipment_type}
							{equipment.model &&
								` • ${equipment.manufacturer} ${equipment.model}`}
						</p>
					</div>
					<div className="flex gap-2 items-center">
						{getStatusBadge(equipment.status)}
						<Button onClick={() => setIsEditing(!isEditing)}>
							{isEditing ? "Отменить" : "Редактировать"}
						</Button>
					</div>
				</div>

				<Tabs defaultValue="details" className="space-y-6">
					<TabsList>
						<TabsTrigger value="details">Детали</TabsTrigger>
						<TabsTrigger value="movements">
							<History className="mr-2 h-4 w-4" />
							История перемещений ({movementHistory?.total || 0})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="details" className="space-y-6">
						<form onSubmit={handleSubmit(onSubmit)}>
							{/* Предупреждение о проблемной пломбе */}
							{equipment.seal_status !== "Исправна" && (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Пломба {equipment.seal_status.toLowerCase()}! Требуется
										проверка.
									</AlertDescription>
								</Alert>
							)}

							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Основная информация */}
							<Card>
								<CardHeader>
									<CardTitle>Основная информация</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label>Тип техники *</Label>
											{isEditing ? (
												<Select
													value={currentType}
													onValueChange={(val) =>
														setValue("equipment_type", val)
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{EQUIPMENT_TYPES.map((type) => (
															<SelectItem key={type} value={type}>
																{type}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<div className="text-sm">
													{equipment.equipment_type}
												</div>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="inventory_number">
												Инвентарный номер *
											</Label>
											<Input
												id="inventory_number"
												{...register("inventory_number")}
												disabled={!isEditing}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="manufacturer">Производитель</Label>
											<Input
												id="manufacturer"
												{...register("manufacturer")}
												disabled={!isEditing}
											/>
										</div>

										<div className="space-y-2">
											<Label htmlFor="model">Модель</Label>
											<Input
												id="model"
												{...register("model")}
												disabled={!isEditing}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="serial_number">Серийный номер</Label>
										<Input
											id="serial_number"
											{...register("serial_number")}
											disabled={!isEditing}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="mni_serial_number">
											Серийный номер МНИ
										</Label>
										<Input
											id="mni_serial_number"
											{...register("mni_serial_number")}
											disabled={!isEditing}
										/>
									</div>
								</CardContent>
							</Card>

							{/* Характеристики */}
							<Card>
								<CardHeader>
									<CardTitle>Технические характеристики</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="cpu">Процессор</Label>
										<Input
											id="cpu"
											{...register("cpu")}
											disabled={!isEditing}
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="ram_gb">Объём RAM (ГБ)</Label>
											<Input
												id="ram_gb"
												type="number"
												{...register("ram_gb", { valueAsNumber: true })}
												disabled={!isEditing}
											/>
										</div>

										<div className="space-y-2">
											<Label>Тип хранилища</Label>
											{isEditing ? (
												<Select
													value={currentStorageType}
													onValueChange={(val) => setValue("storage_type", val)}
												>
													<SelectTrigger>
														<SelectValue placeholder="Выберите тип" />
													</SelectTrigger>
													<SelectContent>
														{STORAGE_TYPES.map((type) => (
															<SelectItem key={type} value={type}>
																{type}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<div className="text-sm">
													{equipment.storage_type || "—"}
												</div>
											)}
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="storage_capacity_gb">
												Объём хранилища (ГБ)
											</Label>
											<Input
												id="storage_capacity_gb"
												type="number"
												{...register("storage_capacity_gb", {
													valueAsNumber: true,
												})}
												disabled={!isEditing}
											/>
										</div>

										<div className="space-y-2">
											<Label htmlFor="operating_system">
												Операционная система
											</Label>
											<Input
												id="operating_system"
												{...register("operating_system")}
												disabled={!isEditing}
											/>
										</div>
									</div>

									<div className="space-y-3">
										<Label>Дополнительные устройства</Label>
										<div className="flex flex-col gap-2">
											<div className="flex items-center space-x-2">
												<Checkbox
													id="has_optical_drive"
													checked={hasOpticalDrive}
													onCheckedChange={(checked) =>
														setValue("has_optical_drive", checked as boolean)
													}
													disabled={!isEditing}
												/>
												<Label
													htmlFor="has_optical_drive"
													className="font-normal"
												>
													Оптический привод
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="has_card_reader"
													checked={hasCardReader}
													onCheckedChange={(checked) =>
														setValue("has_card_reader", checked as boolean)
													}
													disabled={!isEditing}
												/>
												<Label
													htmlFor="has_card_reader"
													className="font-normal"
												>
													Картридер
												</Label>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Размещение */}
							<Card>
								<CardHeader>
									<CardTitle>Размещение</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label>Ответственное лицо</Label>
										{isEditing ? (
											<Select
												value={currentOwnerId?.toString() || ""}
												onValueChange={(val) =>
													setValue(
														"current_owner_id",
														val ? parseInt(val, 10) : undefined,
													)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Выберите владельца (опционально)" />
												</SelectTrigger>
												<SelectContent>
													{personnelData?.items.map((person) => (
														<SelectItem
															key={person.id}
															value={person.id.toString()}
														>
															{person.rank ? `${person.rank} ` : ""}
															{person.full_name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<div className="text-sm">
												{equipment.current_owner_name ? (
													<div>
														{equipment.current_owner_rank &&
															`${equipment.current_owner_rank} `}
														{equipment.current_owner_name}
													</div>
												) : (
													"—"
												)}
											</div>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="current_location">Местоположение</Label>
										<Input
											id="current_location"
											{...register("current_location")}
											disabled={!isEditing}
										/>
									</div>

									<div className="space-y-2">
										<Label>Статус</Label>
										{isEditing ? (
											<Select
												value={currentStatus}
												onValueChange={(val) => setValue("status", val)}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{STATUSES.map((status) => (
														<SelectItem key={status} value={status}>
															{status}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<div>{getStatusBadge(equipment.status)}</div>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Пломба */}
							<Card>
								<CardHeader>
									<CardTitle>Пломбировка</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="seal_number">Номер пломбы</Label>
											<Input
												id="seal_number"
												{...register("seal_number")}
												disabled={!isEditing}
											/>
										</div>

										<div className="space-y-2">
											<Label>Состояние пломбы</Label>
											{isEditing ? (
												<Select
													value={currentSealStatus}
													onValueChange={(val) => setValue("seal_status", val)}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{SEAL_STATUSES.map((status) => (
															<SelectItem key={status} value={status}>
																{status}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<div>{getSealBadge(equipment.seal_status)}</div>
											)}
										</div>
									</div>

									{!isEditing && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
											{equipment.seal_install_date && (
												<div>
													<span className="font-medium">Дата установки:</span>{" "}
													{new Date(
														equipment.seal_install_date,
													).toLocaleDateString("ru-RU")}
												</div>
											)}
											{equipment.seal_check_date && (
												<div>
													<span className="font-medium">
														Последняя проверка:
													</span>{" "}
													{new Date(
														equipment.seal_check_date,
													).toLocaleDateString("ru-RU")}
												</div>
											)}
										</div>
									)}
								</CardContent>
							</Card>

							{/* Примечания */}
							<Card>
								<CardHeader>
									<CardTitle>Примечания</CardTitle>
								</CardHeader>
								<CardContent>
									<Textarea
										{...register("notes")}
										disabled={!isEditing}
										rows={4}
										placeholder="Дополнительная информация..."
									/>
								</CardContent>
							</Card>

							{/* Служебная информация */}
							<Card>
								<CardHeader>
									<CardTitle>Служебная информация</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 text-sm text-muted-foreground">
									<div>
										<span className="font-medium">ID:</span> {equipment.id}
									</div>
									<div>
										<span className="font-medium">Создано:</span>{" "}
										{new Date(equipment.created_at).toLocaleString("ru-RU")}
									</div>
									<div>
										<span className="font-medium">Обновлено:</span>{" "}
										{new Date(equipment.updated_at).toLocaleString("ru-RU")}
									</div>
								</CardContent>
							</Card>

							{isEditing && (
								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsEditing(false)}
									>
										Отмена
									</Button>
									<Button type="submit" disabled={updateMutation.isPending}>
										<Save className="mr-2 h-4 w-4" />
										{updateMutation.isPending
											? "Сохранение..."
											: "Сохранить изменения"}
									</Button>
								</div>
							)}
						</form>
					</TabsContent>

					<TabsContent value="movements">
						<Card>
							<CardHeader>
								<div className="flex justify-between items-center">
									<CardTitle>История перемещений</CardTitle>
									<Button asChild>
										<Link href={`/equipment/${equipmentId}/movements/create`}>
											Добавить перемещение
										</Link>
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{movementHistory?.items.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground">
										Нет записей о перемещениях
									</div>
								) : (
									<div className="space-y-4">
										{movementHistory?.items.map((movement) => (
											<div
												key={movement.id}
												className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
											>
												<div className="flex justify-between items-start mb-2">
													<div className="font-medium">
														{movement.movement_type}
													</div>
													<Badge variant="outline">
														{new Date(movement.created_at).toLocaleDateString(
															"ru-RU",
														)}
													</Badge>
												</div>

												<div className="grid grid-cols-2 gap-4 text-sm">
													<div>
														<span className="text-muted-foreground">
															Откуда:
														</span>{" "}
														{movement.from_location || "—"}
														{movement.from_person_name && (
															<div className="text-muted-foreground text-xs">
																{movement.from_person_name}
															</div>
														)}
													</div>
													<div>
														<span className="text-muted-foreground">Куда:</span>{" "}
														{movement.to_location}
														{movement.to_person_name && (
															<div className="text-muted-foreground text-xs">
																{movement.to_person_name}
															</div>
														)}
													</div>
												</div>

												{movement.document_number && (
													<div className="mt-2 text-sm text-muted-foreground">
														Документ: {movement.document_number}
														{movement.document_date && (
															<>
																{" "}
																от{" "}
																{new Date(
																	movement.document_date,
																).toLocaleDateString("ru-RU")}
															</>
														)}
													</div>
												)}

												{movement.reason && (
													<div className="mt-2 text-sm">
														<span className="text-muted-foreground">
															Причина:
														</span>{" "}
														{movement.reason}
													</div>
												)}

												{(movement.seal_number_before ||
													movement.seal_number_after) && (
													<div className="mt-2 text-sm text-muted-foreground">
														Пломба: {movement.seal_number_before || "—"} →{" "}
														{movement.seal_number_after || "—"}
														{movement.seal_status &&
															` (${movement.seal_status})`}
													</div>
												)}

												{movement.created_by_username && (
													<div className="mt-2 text-xs text-muted-foreground">
														Создал: {movement.created_by_username}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
