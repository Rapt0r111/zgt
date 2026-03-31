import type { NextConfig } from "next";

const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || "192.168.99.101";
const BACKEND_PORT = process.env.BACKEND_PORT || "38801";
const FRONTEND_PORT = process.env.FRONTEND_PORT || "38800";

const BACKEND_URL = `http://${SERVER_IP}:${BACKEND_PORT}`;
const FRONTEND_URL = `http://${SERVER_IP}:${FRONTEND_PORT}`;

const nextConfig: NextConfig = {
	// Обязательно для Docker (создаёт .next/standalone)
	output: "standalone",

	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Content-Security-Policy",
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' data: https: blob:",
							"font-src 'self' data:",
							// Разрешаем API-запросы к бэкенду (localhost для дев, IP для прод)
							`connect-src 'self' http://localhost:${BACKEND_PORT} ${BACKEND_URL} ${FRONTEND_URL} http://localhost:${FRONTEND_PORT}`,
							"frame-ancestors 'none'",
							"base-uri 'self'",
							"form-action 'self'",
						].join("; "),
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
};

export default nextConfig;