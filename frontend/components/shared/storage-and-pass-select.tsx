"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";
import type { StorageAndPass } from "@/types/storage-and-passes";
import { cn } from "@/lib/utils";

interface StorageAndPassSelectProps {
	assetType: "flash_drive" | "electronic_pass";
	value?: number;
	onValueChange: (value: number | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
}

function formatAssetLabel(a: StorageAndPass): string {
	const parts: string[] = [];
	if (a.manufacturer) parts.push(a.manufacturer);
	if (a.model) parts.push(a.model);
	if (a.asset_type === "flash_drive" && a.capacity_gb) parts.push(`${a.capacity_gb} ГБ`);
	if (a.asset_type === "electronic_pass" && a.access_level) parts.push(`Уровень ${a.access_level}`);
	return `${parts.join(" ")} / ${a.serial_number}`.trimStart().replace(/^\/ /, "");
}

export function StorageAndPassSelect({
	assetType,
	value,
	onValueChange,
	placeholder,
	disabled = false,
	error = false,
}: StorageAndPassSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const defaultPlaceholder =
		assetType === "flash_drive" ? "Выберите флешку..." : "Выберите пропуск...";

	const { data, isLoading } = useQuery({
		queryKey: ["storage-and-passes", { asset_type: assetType, limit: 1000 }],
		queryFn: () => storageAndPassesApi.getList({ asset_type: assetType, limit: 1000 }),
		staleTime: 5 * 60 * 1000,
	});

	React.useEffect(() => {
		if (open) {
			const timer = setTimeout(() => inputRef.current?.focus(), 10);
			return () => clearTimeout(timer);
		} else {
			setSearch("");
		}
	}, [open]);

	const selectedItem = React.useMemo(
		() => data?.items.find((a) => a.id === value),
		[data, value],
	);

	const filteredItems = React.useMemo(() => {
		if (!data?.items) return [];
		if (!search.trim()) return data.items;
		const q = search.toLowerCase();
		return data.items.filter(
			(a) =>
				(a.serial_number ?? "").toLowerCase().includes(q) ||
				(a.model ?? "").toLowerCase().includes(q) ||
				(a.manufacturer ?? "").toLowerCase().includes(q),
		);
	}, [data, search]);

	const displayValue = React.useMemo(
		() => (value != null && selectedItem ? formatAssetLabel(selectedItem) : null),
		[value, selectedItem],
	);

	return (
		<PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
			<PopoverPrimitive.Trigger asChild>
				<button
					type="button"
					disabled={disabled}
					className={cn(
						"flex h-9 w-full items-center justify-between rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm shadow-sm transition-all outline-none",
						"hover:border-white/20 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50",
						"disabled:cursor-not-allowed disabled:opacity-50",
						open && "border-primary/50 ring-2 ring-primary/30",
						error && "border-destructive/50 ring-destructive/20",
					)}
				>
					<span className={cn("line-clamp-1 text-left", !displayValue && "text-muted-foreground")}>
						{isLoading ? "Загрузка..." : displayValue ?? (placeholder ?? defaultPlaceholder)}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</button>
			</PopoverPrimitive.Trigger>

			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					className={cn(
						"z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-md border border-white/10 bg-slate-900/95 text-popover-foreground shadow-2xl backdrop-blur-xl",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
					)}
					sideOffset={4}
					align="start"
					side="top"
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<div className="flex items-center border-b border-white/10 px-3 bg-slate-900/95 sticky top-0 z-10">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<input
							ref={inputRef}
							type="text"
							autoComplete="off"
							placeholder="Серийный номер, модель..."
							className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						{search && (
							<X
								className="h-4 w-4 opacity-50 cursor-pointer hover:opacity-100 shrink-0"
								onClick={() => { setSearch(""); inputRef.current?.focus(); }}
							/>
						)}
					</div>

					<div className="max-h-72 overflow-y-auto p-1">
						<button
							type="button"
							className={cn(
								"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none transition-colors",
								"hover:bg-primary/20",
								value == null && "text-primary",
							)}
							onClick={() => { onValueChange(undefined); setOpen(false); }}
						>
							{value == null && <Check className="absolute right-2 h-4 w-4 text-primary" />}
							—
						</button>

						{filteredItems.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
						) : (
							filteredItems.map((item) => {
								const isSelected = item.id === value;
								return (
									<button
										key={item.id}
										type="button"
										className={cn(
											"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none transition-colors text-left",
											"hover:bg-primary/20",
											isSelected && "text-primary",
										)}
										onClick={() => { onValueChange(item.id); setOpen(false); }}
									>
										{isSelected && <Check className="absolute right-2 h-4 w-4 text-primary shrink-0" />}
										<div className="flex flex-col min-w-0">
											<span className="line-clamp-1 font-medium">{formatAssetLabel(item)}</span>
											{item.assigned_to_name && (
												<span className="text-xs text-muted-foreground truncate">
													Назначен: {item.assigned_to_name}
												</span>
											)}
										</div>
									</button>
								);
							})
						)}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}