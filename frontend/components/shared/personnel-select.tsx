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
	emptyOptionLabel?: string;
	disabled?: boolean;
	error?: boolean;
}

export function PersonnelSelect({
	value,
	onValueChange,
	placeholder = "Выберите сотрудника",
	emptyOptionLabel = "—",
	disabled = false,
	error = false,
}: PersonnelSelectProps) {
	const { data: personnelData } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	return (
		<Select
			value={value?.toString() || "__none__"}
			onValueChange={(val) =>
				onValueChange(val === "__none__" ? undefined : parseInt(val, 10))}
			disabled={disabled}
		>
			<SelectTrigger className={error ? "border-destructive" : ""}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="__none__">{emptyOptionLabel}</SelectItem>
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
