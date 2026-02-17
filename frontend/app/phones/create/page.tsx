"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Smartphone, User as UserIcon, Shield, Archive, Save, Camera, Mic } from "lucide-react";
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

type PhoneFormData = z.input<typeof phoneSchema>;

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
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-3xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/phones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

                <div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight">Регистрация телефона</h1>
					<p className="text-muted-foreground mt-1">Добавление личного мобильного устройства в базу учета</p>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b border-white/10 py-6">
						<CardTitle className="text-lg font-semibold flex items-center gap-2">
							<Smartphone className="h-5 w-5 text-primary" />
							Учетная карточка устройства
						</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="p-8 space-y-10">
							{error && (
								<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

                            {/* Секция: Владелец */}
							<div className="space-y-6">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 pb-2 border-b border-white/5">
									<UserIcon className="h-3.5 w-3.5" /> Владелец
								</div>

								<div className="space-y-2">
									<Label className="text-muted-foreground">Военнослужащий *</Label>
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
										<p className="text-xs text-destructive mt-1">
											{errors.owner_id.message}
										</p>
									)}
								</div>
							</div>

                            {/* Секция: Данные телефона */}
							<div className="space-y-6">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 pb-2 border-b border-white/5">
									<Smartphone className="h-3.5 w-3.5" /> Сведения об устройстве
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											placeholder="iPhone 14 Pro"
                                            className="bg-background/50 border-white/10 focus:border-primary/50"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="color" className="text-muted-foreground">Цвет</Label>
										<Input
											id="color"
											{...register("color")}
											placeholder="Чёрный"
                                            className="bg-background/50 border-white/10 focus:border-primary/50"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="imei_1" className="text-muted-foreground">IMEI 1</Label>
										<Input
											id="imei_1"
											{...register("imei_1")}
											placeholder="123456789012345"
											maxLength={15}
                                            className="bg-background/50 border-white/10 font-mono focus:border-primary/50"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="imei_2" className="text-muted-foreground">IMEI 2</Label>
										<Input
											id="imei_2"
											{...register("imei_2")}
											placeholder="123456789012345"
											maxLength={15}
                                            className="bg-background/50 border-white/10 font-mono focus:border-primary/50"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="serial_number" className="text-muted-foreground">Серийный номер</Label>
									<Input
										id="serial_number"
										{...register("serial_number")}
										placeholder="ABC123DEF456"
                                        className="bg-background/50 border-white/10 font-mono focus:border-primary/50 text-sm"
									/>
								</div>

								<div className="space-y-4">
									<Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Особенности и функции</Label>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasCamera ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
											<div className="flex items-center gap-3">
                                                <Camera className={`h-4 w-4 ${hasCamera ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <Label htmlFor="has_camera" className="font-medium cursor-pointer">Камера</Label>
                                            </div>
											<Checkbox
												id="has_camera"
												checked={hasCamera}
												onCheckedChange={(checked) =>
													setValue("has_camera", checked as boolean)
												}
											/>
										</div>
                                        
										<div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasRecorder ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
                                            <div className="flex items-center gap-3">
                                                <Mic className={`h-4 w-4 ${hasRecorder ? 'text-primary' : 'text-muted-foreground'}`} />
											    <Label htmlFor="has_recorder" className="font-medium cursor-pointer">Диктофон</Label>
                                            </div>
											<Checkbox
												id="has_recorder"
												checked={hasRecorder}
												onCheckedChange={(checked) =>
													setValue("has_recorder", checked as boolean)
												}
											/>
										</div>
									</div>
								</div>
							</div>

                            {/* Секция: Хранение */}
							<div className="space-y-6">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 pb-2 border-b border-white/5">
									<Archive className="h-3.5 w-3.5" /> Режим хранения
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="storage_location" className="text-muted-foreground">Ячейка хранения</Label>
                                        <Input
                                            id="storage_location"
                                            {...register("storage_location")}
                                            placeholder="Ячейка 15"
                                            className="bg-background/50 border-white/10 focus:border-primary/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Статус</Label>
                                        <Select
                                            value={currentStatus}
                                            onValueChange={(val) => setValue("status", val)}
                                        >
                                            <SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="glass border-white/10">
                                                <SelectItem value="Выдан">Выдан</SelectItem>
                                                <SelectItem value="Сдан">Сдан</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
							</div>
						</CardContent>

						<CardFooter className="bg-white/5 border-t border-white/10 p-8 flex justify-between">
							<Button type="button" variant="ghost" asChild className="hover:bg-white/10 text-muted-foreground">
								<Link href="/phones">Отмена</Link>
							</Button>
							<Button 
                                type="submit" 
                                disabled={createMutation.isPending}
                                className="gradient-primary border-0 shadow-lg px-8 font-semibold"
                            >
								{createMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        Сохранение...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Save className="h-4 w-4" />
                                        Создать запись
                                    </div>
                                )}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}