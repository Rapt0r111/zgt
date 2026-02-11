import axios from "axios";
import { toast } from "sonner";

const CSRF_STORAGE_KEY = "zgt_csrf_token";

const apiClient = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
	timeout: 30000,
});

const getStoredCsrfToken = (): string | null => {
	if (typeof window === "undefined") {
		return null;
	}
	return window.sessionStorage.getItem(CSRF_STORAGE_KEY);
};

const storeCsrfToken = (token: string) => {
	if (typeof window === "undefined") {
		return;
	}
	window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
};

let csrfToken: string | null = getStoredCsrfToken();

apiClient.interceptors.response.use(
	(response) => {
		if (response.headers["x-csrf-token"]) {
			const token = response.headers["x-csrf-token"] as string;
			csrfToken = token;
			storeCsrfToken(token);
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

	if (isMutating && !isExempt) {
		if (!csrfToken) {
			csrfToken = getStoredCsrfToken();
		}

		if (csrfToken) {
			config.headers["X-CSRF-Token"] = csrfToken;
		}
	}

	return config;
});

export default apiClient;
