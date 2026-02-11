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
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const assetSchema = z
	.object({
		asset_type: z.enum(["flash_drive", "electronic_pass"], {
			message: "Выберите тип устройства",
		}),

		serial_number: z.string().min(1, "Серийный номер обязателен"),

		model: z.string().optional(),
		manufacturer: z.string().optional(),

		status: z.enum(["in_use", "stock", "broken", "lost"]),

		assigned_to_id: z.number().optional(),
		capacity_gb: z.number().optional(),
		access_level: z.number().min(1).max(10).optional(),

		notes: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.asset_type === "flash_drive" && !data.capacity_gb) {
				return false;
			}
			return true;
		},
		{
			message: "Для флешки обязателен объём в ГБ",
			path: ["capacity_gb"],
		},
	)
	.refine(
		(data) => {
			if (data.asset_type === "electronic_pass" && !data.access_level) {
				return false;
			}
			return true;
		},
		{
			message: "Для пропуска обязателен уровень доступа",
			path: ["access_level"],
		},
	)
	.refine(
		(data) => {
			if (data.status === "in_use" && !data.assigned_to_id) {
				return false;
			}
			return true;
		},
		{
			message: 'Для статуса "В использовании" необходимо указать владельца',
			path: ["assigned_to_id"],
		},
	);

type AssetFormData = z.infer<typeof assetSchema>;

export default function CreateStorageAndPassPage() {
	const router = useRouter();
	const [error, setError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<AssetFormData>({
		resolver: zodResolver(assetSchema),
		defaultValues: {
			status: "stock",
			model: "",
			manufacturer: "",
			notes: "",
		},
	});

	const createMutation = useMutation({
		mutationFn: (data: AssetFormData) => storageAndPassesApi.create(data),
		onSuccess: () => {
			toast.success("Актив добавлен");
			router.push("/storage-and-passes");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: AssetFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		createMutation.mutate(cleanedData as AssetFormData);
	};

	const currentType = watch("asset_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("assigned_to_id");

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-3xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/storage-and-passes">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Добавить носитель или пропуск</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="space-y-6">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-2">
								<Label>Тип устройства *</Label>
								<Select
									value={currentType}
									onValueChange={(val) =>
										setValue("asset_type", val as AssetFormData["asset_type"], {
											shouldValidate: true,
										})
									}
								>
									<SelectTrigger
										className={errors.asset_type ? "border-destructive" : ""}
									>
										<SelectValue placeholder="Выберите тип" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="flash_drive">USB-флешка</SelectItem>
										<SelectItem value="electronic_pass">
											Электронный пропуск
										</SelectItem>
									</SelectContent>
								</Select>
								{errors.asset_type && (
									<p className="text-sm text-destructive">
										{errors.asset_type.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="serial_number">Серийный номер *</Label>
								<Input
									id="serial_number"
									{...register("serial_number")}
									placeholder="ABC123XYZ"
									className={errors.serial_number ? "border-destructive" : ""}
								/>
								{errors.serial_number && (
									<p className="text-sm text-destructive">
										{errors.serial_number.message}
									</p>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="manufacturer">Производитель</Label>
									<Input
										id="manufacturer"
										{...register("manufacturer")}
										placeholder="Kingston, Transcend..."
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="model">Модель</Label>
									<Input
										id="model"
										{...register("model")}
										placeholder="DataTraveler 100 G3"
									/>
								</div>
							</div>

							{currentType === "flash_drive" && (
								<div className="space-y-2">
									<Label htmlFor="capacity_gb">Объём (ГБ) *</Label>
									<Input
										id="capacity_gb"
										type="number"
										{...register("capacity_gb", { valueAsNumber: true })}
										placeholder="16"
										className={errors.capacity_gb ? "border-destructive" : ""}
									/>
									{errors.capacity_gb && (
										<p className="text-sm text-destructive">
											{errors.capacity_gb.message}
										</p>
									)}
								</div>
							)}

							{currentType === "electronic_pass" && (
								<div className="space-y-2">
									<Label htmlFor="access_level">Уровень доступа (1-10) *</Label>
									<Input
										id="access_level"
										type="number"
										{...register("access_level", { valueAsNumber: true })}
										placeholder="3"
										min="1"
										max="10"
										className={errors.access_level ? "border-destructive" : ""}
									/>
									{errors.access_level && (
										<p className="text-sm text-destructive">
											{errors.access_level.message}
										</p>
									)}
								</div>
							)}

							<div className="space-y-2">
								<Label>Статус</Label>
								<Select
									value={currentStatus}
									onValueChange={(val) =>
										setValue("status", val as AssetFormData["status"], {
											shouldValidate: true,
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="stock">На складе</SelectItem>
										<SelectItem value="in_use">Используется</SelectItem>
										<SelectItem value="broken">Сломан</SelectItem>
										<SelectItem value="lost">Утерян</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{currentStatus === "in_use" && (
								<div className="space-y-2">
									<Label>Владелец *</Label>
									<PersonnelSelect
										value={currentOwnerId}
										onValueChange={(val) =>
											setValue("assigned_to_id", val, { shouldValidate: true })
										}
										placeholder="Выберите сотрудника"
										error={!!errors.assigned_to_id}
									/>
									{errors.assigned_to_id && (
										<p className="text-sm text-destructive">
											{errors.assigned_to_id.message}
										</p>
									)}
									<p className="text-sm text-muted-foreground">
										При статусе &quot;Используется&quot; необходимо указать
										владельца
									</p>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="notes">Примечания</Label>
								<Textarea
									id="notes"
									{...register("notes")}
									placeholder="Дополнительная информация..."
									rows={3}
								/>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between border-t mt-6 pt-6">
							<Button type="button" variant="outline" asChild>
								<Link href="/storage-and-passes">Отмена</Link>
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Сохранение..." : "Создать"}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
