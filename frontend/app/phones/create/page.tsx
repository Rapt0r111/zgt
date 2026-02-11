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

export default function CreatePhonePage() {
	const router = useRouter();
	const [error, setError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<PhoneFormData>({
		resolver: zodResolver(phoneSchema),
		defaultValues: {
			has_camera: true,
			has_recorder: true,
			status: "Выдан",
		},
	});

	const createMutation = useMutation({
		mutationFn: (data: PhoneFormData) => phonesApi.create(data),
		onSuccess: () => {
			toast.success("Телефон добавлен");
			router.push("/phones");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка при создании");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: PhoneFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		createMutation.mutate(cleanedData as PhoneFormData);
	};

	const currentOwnerId = watch("owner_id");
	const currentStatus = watch("status");
	const hasCamera = watch("has_camera");
	const hasRecorder = watch("has_recorder");

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-3xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/phones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Добавить телефон</CardTitle>
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
									Владелец
								</h3>

								<div className="space-y-2">
									<Label>Военнослужащий *</Label>
									<PersonnelSelect
										value={currentOwnerId}
										onValueChange={(val) => {
											if (val)
												setValue("owner_id", val, { shouldValidate: true });
										}}
										placeholder="Выберите владельца"
										error={!!errors.owner_id}
									/>
									{errors.owner_id && (
										<p className="text-sm text-destructive">
											{errors.owner_id.message}
										</p>
									)}
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Данные телефона
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="model">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											placeholder="iPhone 14 Pro"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="color">Цвет</Label>
										<Input
											id="color"
											{...register("color")}
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
											placeholder="123456789012345"
											maxLength={15}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="imei_2">IMEI 2</Label>
										<Input
											id="imei_2"
											{...register("imei_2")}
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
										placeholder="ABC123DEF456"
									/>
								</div>

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
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Хранение
								</h3>

								<div className="space-y-2">
									<Label htmlFor="storage_location">Ячейка хранения</Label>
									<Input
										id="storage_location"
										{...register("storage_location")}
										placeholder="Ячейка 15"
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
											<SelectItem value="Выдан">Выдан</SelectItem>
											<SelectItem value="Сдан">Сдан</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between border-t mt-6 pt-6">
							<Button type="button" variant="outline" asChild>
								<Link href="/phones">Отмена</Link>
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
