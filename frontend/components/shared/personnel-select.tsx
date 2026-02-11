"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { personnelApi } from "@/lib/api/personnel";

interface PersonnelSelectProps {
	value?: number;
	onValueChange: (value: number | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
}

export function PersonnelSelect({
	value,
	onValueChange,
	placeholder = "Выберите сотрудника",
	disabled = false,
	error = false,
}: PersonnelSelectProps) {
	const { data: personnelData } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	return (
		<Select
			value={value?.toString() || ""}
			onValueChange={(val) =>
				onValueChange(val ? parseInt(val, 10) : undefined)
			}
			disabled={disabled}
		>
			<SelectTrigger className={error ? "border-destructive" : ""}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{personnelData?.items.map((person) => (
					<SelectItem key={person.id} value={person.id.toString()}>
						{person.rank && `${person.rank} `}
						{person.full_name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
