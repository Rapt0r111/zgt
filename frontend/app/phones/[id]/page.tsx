"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
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
import { personnelApi } from "@/lib/api/personnel";
import { phonesApi } from "@/lib/api/phones";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const phoneSchema = z.object({
	owner_id: z.number().min(1, "Выберите владельца"),
	model: z.string().default(""),
	color: z.string().default(""),
	imei_1: z.string().default(""),
	imei_2: z.string().default(""),
	serial_number: z.string().default(""),
	has_camera: z.boolean().default(true),
	has_recorder: z.boolean().default(true),
	storage_location: z.string().default(""),
	status: z.string().default("Выдан"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

export default function PhoneDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	const phoneId = parseInt(params.id as string, 10);

	const { data: phone, isLoading } = useQuery({
		queryKey: ["phone", phoneId],
		queryFn: () => phonesApi.getById(phoneId),
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
	} = useForm({
		resolver: zodResolver(phoneSchema),
	});

	useEffect(() => {
		if (phone) {
			reset({
				owner_id: phone.owner_id,
				model: phone.model || "",
				color: phone.color || "",
				imei_1: phone.imei_1 || "",
				imei_2: phone.imei_2 || "",
				serial_number: phone.serial_number || "",
				has_camera: phone.has_camera,
				has_recorder: phone.has_recorder,
				storage_location: phone.storage_location || "",
				status: phone.status,
			});
		}
	}, [phone, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: PhoneFormData) => phonesApi.update(phoneId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["phone", phoneId] });
			queryClient.invalidateQueries({ queryKey: ["phones"] });
			setIsEditing(false);
			setError("");
			toast.success("Данные обновлены");
		},
		onError: (err: any) => {
			setError(err.response?.data?.detail || "Ошибка при обновлении");
			toast.error("Ошибка при обновлении");
		},
	});

	const onSubmit = (data: PhoneFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		updateMutation.mutate(cleanedData as PhoneFormData);
	};

	const currentOwnerId = watch("owner_id");
	const currentStatus = watch("status");
	const hasCamera = watch("has_camera");
	const hasRecorder = watch("has_recorder");

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Загрузка...</p>
			</div>
		);
	}

	if (!phone) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Телефон не найден</p>
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		return status === "Выдан" ? (
			<Badge variant="default" className="gap-1">
				<CheckCircle2 className="h-3 w-3" />
				Выдан
			</Badge>
		) : (
			<Badge variant="secondary" className="gap-1">
				<XCircle className="h-3 w-3" />
				Сдан
			</Badge>
		);
	};

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/phones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex justify-between items-start mb-6">
					<div>
						<h1 className="text-3xl font-bold">
							{phone.model || "Телефон без модели"}
						</h1>
						<p className="text-muted-foreground mt-1">
							Владелец: {phone.owner_full_name || "Не указан"}
							{phone.owner_rank && ` • ${phone.owner_rank}`}
						</p>
					</div>
					<div className="flex gap-2 items-center">
						{getStatusBadge(phone.status)}
						<Button onClick={() => setIsEditing(!isEditing)}>
							{isEditing ? "Отменить" : "Редактировать"}
						</Button>
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-6">
						{/* Владелец */}
						<Card>
							<CardHeader>
								<CardTitle>Владелец</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{error && (
									<Alert variant="destructive">
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}

								<div className="space-y-2">
									<Label>Военнослужащий *</Label>
									{isEditing ? (
										<Select
											value={currentOwnerId?.toString() || ""}
											onValueChange={(val) =>
												setValue("owner_id", parseInt(val, 10))
											}
										>
											<SelectTrigger
												className={errors.owner_id ? "border-destructive" : ""}
											>
												<SelectValue placeholder="Выберите владельца" />
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
											{phone.owner_rank && `${phone.owner_rank} `}
											{phone.owner_full_name || "Не указан"}
										</div>
									)}
									{errors.owner_id && (
										<p className="text-sm text-destructive">
											{errors.owner_id.message as string}
										</p>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Данные телефона */}
						<Card>
							<CardHeader>
								<CardTitle>Данные телефона</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="model">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											disabled={!isEditing}
											placeholder="iPhone 14 Pro"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="color">Цвет</Label>
										<Input
											id="color"
											{...register("color")}
											disabled={!isEditing}
											placeholder="Чёрный"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="imei_1">IMEI 1</Label>
										<Input
											id="imei_1"
											{...register("imei_1")}
											disabled={!isEditing}
											placeholder="123456789012345"
											maxLength={15}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="imei_2">IMEI 2</Label>
										<Input
											id="imei_2"
											{...register("imei_2")}
											disabled={!isEditing}
											placeholder="123456789012345"
											maxLength={15}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="serial_number">Серийный номер</Label>
									<Input
										id="serial_number"
										{...register("serial_number")}
										disabled={!isEditing}
										placeholder="ABC123DEF456"
									/>
								</div>

								{/* Функции */}
								<div className="space-y-3">
									<Label>Функции устройства</Label>
									<div className="flex flex-col gap-2">
										<div className="flex items-center space-x-2">
											<Checkbox
												id="has_camera"
												checked={hasCamera}
												onCheckedChange={(checked) =>
													setValue("has_camera", checked as boolean)
												}
												disabled={!isEditing}
											/>
											<Label
												htmlFor="has_camera"
												className="font-normal cursor-pointer"
											>
												Есть камера
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="has_recorder"
												checked={hasRecorder}
												onCheckedChange={(checked) =>
													setValue("has_recorder", checked as boolean)
												}
												disabled={!isEditing}
											/>
											<Label
												htmlFor="has_recorder"
												className="font-normal cursor-pointer"
											>
												Есть диктофон
											</Label>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Хранение */}
						<Card>
							<CardHeader>
								<CardTitle>Хранение и статус</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="storage_location">Ячейка хранения</Label>
									<Input
										id="storage_location"
										{...register("storage_location")}
										disabled={!isEditing}
										placeholder="Ячейка 15"
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
												<SelectItem value="Выдан">Выдан</SelectItem>
												<SelectItem value="Сдан">Сдан</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<div>{getStatusBadge(phone.status)}</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Метаданные */}
						<Card>
							<CardHeader>
								<CardTitle>Служебная информация</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<div>
									<span className="font-medium">Создан:</span>{" "}
									{new Date(phone.created_at).toLocaleString("ru-RU")}
								</div>
								<div>
									<span className="font-medium">Обновлён:</span>{" "}
									{new Date(phone.updated_at).toLocaleString("ru-RU")}
								</div>
							</CardContent>
						</Card>
					</div>

					{isEditing && (
						<div className="mt-6 flex justify-end">
							<Button type="submit" disabled={updateMutation.isPending}>
								<Save className="mr-2 h-4 w-4" />
								{updateMutation.isPending
									? "Сохранение..."
									: "Сохранить изменения"}
							</Button>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
