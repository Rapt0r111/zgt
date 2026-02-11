"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserMinus, UserPlus } from "lucide-react";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { personnelApi } from "@/lib/api/personnel";
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const assetSchema = z
	.object({
		asset_type: z.enum(["flash_drive", "electronic_pass"]),
		serial_number: z.string().min(1),
		model: z.string().default(""),
		manufacturer: z.string().default(""),
		status: z.enum(["in_use", "stock", "broken", "lost"]),
		assigned_to_id: z.number().optional(),
		capacity_gb: z.number().optional(),
		access_level: z.number().optional(),
		notes: z.string().default(""),
	})
	.refine(
		(data) => {
			// Если выбран статус "В использовании", владелец обязателен
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

export default function StorageAndPassDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | null>(
		null,
	);

	const assetId = parseInt(params.id as string, 10);

	const { data: asset, isLoading } = useQuery({
		queryKey: ["storage-and-pass", assetId],
		queryFn: () => storageAndPassesApi.getById(assetId),
	});

	const { data: personnelData } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<AssetFormData>({
		resolver: zodResolver(assetSchema),
	});

	useEffect(() => {
		if (asset) {
			reset({
				asset_type: asset.asset_type,
				serial_number: asset.serial_number,
				model: asset.model || "",
				manufacturer: asset.manufacturer || "",
				status: asset.status,
				assigned_to_id: asset.assigned_to_id,
				capacity_gb: asset.capacity_gb,
				access_level: asset.access_level,
				notes: asset.notes || "",
			});
		}
	}, [asset, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: AssetFormData) =>
			storageAndPassesApi.update(assetId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["storage-and-pass", assetId],
			});
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			setIsEditing(false);
			setError("");
			toast.success("Данные обновлены");
		},
		onError: (err: any) => {
			setError(err.response?.data?.detail || "Ошибка при обновлении");
			toast.error("Ошибка при обновлении");
		},
	});

	const assignMutation = useMutation({
		mutationFn: (personnelId: number) =>
			storageAndPassesApi.assign(assetId, { assigned_to_id: personnelId }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["storage-and-pass", assetId],
			});
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			setShowAssignDialog(false);
			setSelectedPersonnelId(null);
			toast.success("Устройство выдано");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.detail || "Ошибка при выдаче");
		},
	});

	const revokeMutation = useMutation({
		mutationFn: () => storageAndPassesApi.revoke(assetId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["storage-and-pass", assetId],
			});
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			toast.success("Устройство возвращено");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.detail || "Ошибка при возврате");
		},
	});

	const onSubmit = (data: AssetFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		updateMutation.mutate(cleanedData as AssetFormData);
	};

	const handleAssign = () => {
		if (selectedPersonnelId) {
			assignMutation.mutate(selectedPersonnelId);
		}
	};

	const currentStatus = watch("status");
	const currentOwnerId = watch("assigned_to_id");

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Загрузка...</p>
			</div>
		);
	}

	if (!asset) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Актив не найден</p>
			</div>
		);
	}

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

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/storage-and-passes">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex justify-between items-start mb-6">
					<div>
						<h1 className="text-3xl font-bold">{asset.serial_number}</h1>
						<p className="text-muted-foreground mt-1">
							{asset.asset_type === "flash_drive"
								? "USB-флешка"
								: "Электронный пропуск"}
							{asset.model && ` • ${asset.manufacturer} ${asset.model}`}
						</p>
					</div>
					<div className="flex gap-2 items-center">
						{getStatusBadge(asset.status)}
						{asset.status === "stock" && (
							<Dialog
								open={showAssignDialog}
								onOpenChange={setShowAssignDialog}
							>
								<DialogTrigger asChild>
									<Button size="sm" variant="outline">
										<UserPlus className="mr-2 h-4 w-4" />
										Выдать
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Выдать устройство</DialogTitle>
									</DialogHeader>
									<div className="space-y-4">
										<div className="space-y-2">
											<Label>Выберите сотрудника</Label>
											<Select
												value={selectedPersonnelId?.toString() || ""}
												onValueChange={(val) =>
													setSelectedPersonnelId(parseInt(val, 10))
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Выберите сотрудника" />
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
										</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="outline"
												onClick={() => setShowAssignDialog(false)}
											>
												Отмена
											</Button>
											<Button
												onClick={handleAssign}
												disabled={
													!selectedPersonnelId || assignMutation.isPending
												}
											>
												{assignMutation.isPending ? "Выдача..." : "Выдать"}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						)}
						{asset.status === "in_use" && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => revokeMutation.mutate()}
								disabled={revokeMutation.isPending}
							>
								<UserMinus className="mr-2 h-4 w-4" />
								{revokeMutation.isPending ? "Возврат..." : "Вернуть"}
							</Button>
						)}
						<Button onClick={() => setIsEditing(!isEditing)}>
							{isEditing ? "Отменить" : "Редактировать"}
						</Button>
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-6">
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
										<Label htmlFor="serial_number">Серийный номер</Label>
										<Input
											id="serial_number"
											{...register("serial_number")}
											disabled={!isEditing}
										/>
									</div>

									<div className="space-y-2">
										<Label>Статус</Label>
										{isEditing ? (
											<Select
												value={currentStatus}
												onValueChange={(val) =>
													setValue("status", val as any, {
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
										) : (
											<div>{getStatusBadge(asset.status)}</div>
										)}
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

								{asset.asset_type === "flash_drive" && (
									<div className="space-y-2">
										<Label htmlFor="capacity_gb">Объём (ГБ)</Label>
										<Input
											id="capacity_gb"
											type="number"
											{...register("capacity_gb", { valueAsNumber: true })}
											disabled={!isEditing}
										/>
									</div>
								)}

								{asset.asset_type === "electronic_pass" && (
									<div className="space-y-2">
										<Label htmlFor="access_level">Уровень доступа</Label>
										<Input
											id="access_level"
											type="number"
											{...register("access_level", { valueAsNumber: true })}
											disabled={!isEditing}
										/>
									</div>
								)}

								{/* Владелец в режиме редактирования */}
								{isEditing && currentStatus === "in_use" && (
									<div className="space-y-2">
										<Label>Владелец *</Label>
										<Select
											value={currentOwnerId?.toString() || ""}
											onValueChange={(val) =>
												setValue(
													"assigned_to_id",
													val ? parseInt(val, 10) : undefined,
													{ shouldValidate: true },
												)
											}
										>
											<SelectTrigger
												className={
													errors.assigned_to_id ? "border-destructive" : ""
												}
											>
												<SelectValue placeholder="Выберите сотрудника" />
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
										{errors.assigned_to_id && (
											<p className="text-sm text-destructive">
												{errors.assigned_to_id.message as string}
											</p>
										)}
										<p className="text-sm text-muted-foreground">
											При статусе "Используется" необходимо указать владельца
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Владелец (отображение) */}
						{asset.assigned_to_name && (
							<Card>
								<CardHeader>
									<CardTitle>Текущий владелец</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-sm">
										<div className="font-medium">{asset.assigned_to_name}</div>
										{asset.assigned_to_rank && (
											<div className="text-muted-foreground">
												{asset.assigned_to_rank}
											</div>
										)}
										{asset.issue_date && (
											<div className="mt-2 text-muted-foreground">
												Выдано:{" "}
												{new Date(asset.issue_date).toLocaleString("ru-RU")}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}

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

						{/* Метаданные */}
						<Card>
							<CardHeader>
								<CardTitle>Служебная информация</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<div>
									<span className="font-medium">ID:</span> {asset.id}
								</div>
								<div>
									<span className="font-medium">Создано:</span>{" "}
									{new Date(asset.created_at).toLocaleString("ru-RU")}
								</div>
								<div>
									<span className="font-medium">Обновлено:</span>{" "}
									{new Date(asset.updated_at).toLocaleString("ru-RU")}
								</div>
							</CardContent>
						</Card>
					</div>

					{isEditing && (
						<div className="mt-6 flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditing(false)}
							>
								Отмена
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								<Save className="mr-2 h-4 w-4" />
								{updateMutation.isPending ? "Сохранение..." : "Сохранить"}
							</Button>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
