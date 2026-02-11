import axios from "axios";
import { toast } from "sonner";

const apiClient = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
	timeout: 30000,
});

let csrfToken: string | null = null;

apiClient.interceptors.response.use(
	(response) => {
		if (response.headers["x-csrf-token"]) {
			csrfToken = response.headers["x-csrf-token"];
		}
		return response;
	},
	(error) => {
		if (error.response?.status === 422) {
			console.error(
				"Validation Error:",
				JSON.stringify(error.response.data, null, 2),
			);
		}

		if (error.response?.status === 401) {
			toast.error("Сессия истекла");
			window.location.href = "/login";
		}

		if (error.response?.status === 403) {
			if (error.response.data?.detail?.includes("CSRF")) {
				toast.error("Ошибка безопасности. Обновите страницу.");
			} else {
				toast.error("Недостаточно прав");
			}
		}

		if (error.response?.status === 429) {
			toast.error("Слишком много запросов. Попробуйте позже.");
		}

		if (error.response?.status >= 500) {
			toast.error("Ошибка сервера");
		}

		return Promise.reject(error);
	},
);

const CSRF_EXEMPT_ENDPOINTS = ["/api/auth/login", "/api/auth/logout"];

apiClient.interceptors.request.use((config) => {
	const mutatingMethods = ["post", "put", "patch", "delete"];
	const isMutating = mutatingMethods.includes(
		config.method?.toLowerCase() || "",
	);
	const isExempt = CSRF_EXEMPT_ENDPOINTS.some((endpoint) =>
		config.url?.includes(endpoint),
	);

	if (isMutating && !isExempt && csrfToken) {
		config.headers["X-CSRF-Token"] = csrfToken;
	}

	return config;
});

export default apiClient;
