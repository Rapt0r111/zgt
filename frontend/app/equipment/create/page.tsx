"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PersonnelSelect } from "@/components/shared/personnel-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { equipmentApi } from "@/lib/api/equipment";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const EQUIPMENT_TYPES = ["АРМ", "Ноутбук", "Сервер", "Принтер", "Другое"];
const STATUSES = ["В работе", "На складе", "В ремонте", "Списан"];
const STORAGE_TYPES = ["HDD", "SSD", "NVMe", "Другое"];

const equipmentSchema = z.object({
	equipment_type: z.string().min(1, "Выберите тип техники"),
	inventory_number: z.string().min(1, "Инвентарный номер обязателен"),
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
	has_laptop: z.boolean().default(false),
	laptop_functional: z.boolean().default(true),
	has_charger: z.boolean().default(false),
	charger_functional: z.boolean().default(true),
	has_mouse: z.boolean().default(false),
	mouse_functional: z.boolean().default(true),
	has_bag: z.boolean().default(false),
	bag_functional: z.boolean().default(true),
	operating_system: z.string().default(""),
	current_owner_id: z.number().optional(),
	current_location: z.string().default(""),
	seal_number: z.string().default(""),
	seal_status: z.string().default("Исправна"),
	status: z.string().default("В работе"),
	notes: z.string().default(""),
});

type EquipmentFormData = z.input<typeof equipmentSchema>;

export default function CreateEquipmentPage() {
	const router = useRouter();
	const [error, setError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<EquipmentFormData>({
		resolver: zodResolver(equipmentSchema),
		defaultValues: {
			equipment_type: "",
			status: "В работе",
			seal_status: "Исправна",
			has_optical_drive: false,
			has_card_reader: false,
			has_laptop: false,
			laptop_functional: true,
			has_charger: false,
			charger_functional: true,
			has_mouse: false,
			mouse_functional: true,
			has_bag: false,
			bag_functional: true,
		},
	});

	const createMutation = useMutation({
		mutationFn: (data: EquipmentFormData) => equipmentApi.create(data),
		onSuccess: () => {
			toast.success("Техника добавлена");
			router.push("/equipment");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка при создании");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: EquipmentFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		createMutation.mutate(cleanedData as EquipmentFormData);
	};

	const currentType = watch("equipment_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("current_owner_id");
	const currentStorageType = watch("storage_type");
	const hasOpticalDrive = watch("has_optical_drive");
	const hasCardReader = watch("has_card_reader");
	const hasLaptop = watch("has_laptop");
	const laptopFunctional = watch("laptop_functional");
	const hasCharger = watch("has_charger");
	const chargerFunctional = watch("charger_functional");
	const hasMouse = watch("has_mouse");
	const mouseFunctional = watch("mouse_functional");
	const hasBag = watch("has_bag");
	const bagFunctional = watch("bag_functional");
	

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/equipment">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Добавить технику</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="space-y-6">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Основная информация
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Тип техники *</Label>
										<Select
											value={currentType}
											onValueChange={(val) => setValue("equipment_type", val)}
										>
											<SelectTrigger
												className={
													errors.equipment_type ? "border-destructive" : ""
												}
											>
												<SelectValue placeholder="Выберите тип" />
											</SelectTrigger>
											<SelectContent>
												{EQUIPMENT_TYPES.map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.equipment_type && (
											<p className="text-sm text-destructive">
												{errors.equipment_type.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="inventory_number">
											Инвентарный номер *
										</Label>
										<Input
											id="inventory_number"
											{...register("inventory_number")}
											placeholder="ИНВ-001"
											className={
												errors.inventory_number ? "border-destructive" : ""
											}
										/>
										{errors.inventory_number && (
											<p className="text-sm text-destructive">
												{errors.inventory_number.message}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="manufacturer">Производитель</Label>
										<Input
											id="manufacturer"
											{...register("manufacturer")}
											placeholder="Dell, HP, Lenovo..."
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="model">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											placeholder="OptiPlex 7090"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="serial_number">Серийный номер</Label>
									<Input
										id="serial_number"
										{...register("serial_number")}
										placeholder="S/N: ABC123XYZ"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="mni_serial_number">Серийный номер МНИ</Label>
									<Input
										id="mni_serial_number"
										{...register("mni_serial_number")}
										placeholder="МНИ: MNI789456"
									/>
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Характеристики
								</h3>

								<div className="space-y-2">
									<Label htmlFor="cpu">Процессор</Label>
									<Input
										id="cpu"
										{...register("cpu")}
										placeholder="Intel Core i5-10400"
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="ram_gb">Объём RAM (ГБ)</Label>
										<Input
											id="ram_gb"
											type="number"
											{...register("ram_gb", { valueAsNumber: true })}
											placeholder="16"
										/>
									</div>

									<div className="space-y-2">
										<Label>Тип хранилища</Label>
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
											placeholder="512"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="operating_system">
											Операционная система
										</Label>
										<Input
											id="operating_system"
											{...register("operating_system")}
											placeholder="Windows 10 Pro"
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
											/>
											<Label
												htmlFor="has_optical_drive"
												className="font-normal cursor-pointer"
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
											/>
											<Label
												htmlFor="has_card_reader"
												className="font-normal cursor-pointer"
											>
												Картридер
											</Label>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
											<div className="flex items-center space-x-2">
												<Checkbox
													id="has_laptop"
													checked={hasLaptop}
													onCheckedChange={(checked) =>
														setValue("has_laptop", checked as boolean)
													}
												/>
												<Label
													htmlFor="has_laptop"
													className="font-normal cursor-pointer"
												>
													Ноутбук (в наличии)
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="laptop_functional"
													checked={laptopFunctional}
													onCheckedChange={(checked) =>
														setValue("laptop_functional", checked as boolean)
													}
												/>
												<Label
													htmlFor="laptop_functional"
													className="font-normal cursor-pointer"
												>
													Ноутбук исправен
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="has_charger"
													checked={hasCharger}
													onCheckedChange={(checked) =>
														setValue("has_charger", checked as boolean)
													}
												/>
												<Label
													htmlFor="has_charger"
													className="font-normal cursor-pointer"
												>
													Зарядка (в наличии)
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="charger_functional"
													checked={chargerFunctional}
													onCheckedChange={(checked) =>
														setValue("charger_functional", checked as boolean)
													}
												/>
												<Label
													htmlFor="charger_functional"
													className="font-normal cursor-pointer"
												>
													Зарядка исправна
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="has_mouse"
													checked={hasMouse}
													onCheckedChange={(checked) =>
														setValue("has_mouse", checked as boolean)
													}
												/>
												<Label
													htmlFor="has_mouse"
													className="font-normal cursor-pointer"
												>
													Мышь (в наличии)
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="mouse_functional"
													checked={mouseFunctional}
													onCheckedChange={(checked) =>
														setValue("mouse_functional", checked as boolean)
													}
												/>
												<Label
													htmlFor="mouse_functional"
													className="font-normal cursor-pointer"
												>
													Мышь исправна
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="has_bag"
													checked={hasBag}
													onCheckedChange={(checked) =>
														setValue("has_bag", checked as boolean)
													}
												/>
												<Label
													htmlFor="has_bag"
													className="font-normal cursor-pointer"
												>
													Сумка (в наличии)
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="bag_functional"
													checked={bagFunctional}
													onCheckedChange={(checked) =>
														setValue("bag_functional", checked as boolean)
													}
												/>
												<Label
													htmlFor="bag_functional"
													className="font-normal cursor-pointer"
												>
													Сумка исправна
												</Label>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Размещение
								</h3>

								<div className="space-y-2">
									<Label>Ответственное лицо</Label>
									<PersonnelSelect
										value={currentOwnerId}
										onValueChange={(val) => setValue("current_owner_id", val)}
										placeholder="Выберите владельца (опционально)"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="current_location">Местоположение</Label>
									<Input
										id="current_location"
										{...register("current_location")}
										placeholder="Каб. 205, Склад №1"
									/>
								</div>

								<div className="space-y-2">
									<Label>Статус</Label>
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
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">Пломба</h3>

								<div className="space-y-2">
									<Label htmlFor="seal_number">Номер пломбы</Label>
									<Input
										id="seal_number"
										{...register("seal_number")}
										placeholder="П-123456"
									/>
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Примечания
								</h3>

								<div className="space-y-2">
									<Label htmlFor="notes">Дополнительная информация</Label>
									<Textarea
										id="notes"
										{...register("notes")}
										placeholder="Дополнительные сведения о технике..."
										rows={4}
									/>
								</div>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between border-t mt-6 pt-6">
							<Button type="button" variant="outline" asChild>
								<Link href="/equipment">Отмена</Link>
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Сохранение..." : "Создать запись"}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
