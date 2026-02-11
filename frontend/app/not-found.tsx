// pages/404.js
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
// Правильный импорт CSS-модуля (путь зависит от того, куда ты его положил)
import styles from "../styles/error.module.css";

export default function NotFound() {
	return (
		<>
			<Head>
				<title>Oops! Page not found</title>
			</Head>

			<main className={styles.errorContainer}>
				<Image
					className={styles.image}
					// Обращаемся к файлу в public просто через слеш:
					src="/error.svg"
					width={640}
					height={220}
					alt="Error 404 - Page not found"
					priority // Рекомендуется для картинок на первом экране, чтобы они грузились быстрее
				/>
				<h1>404</h1>
				<p>Oops! This page is lost in space.</p>

				{/* В новых версиях Next.js тег <a> внутри Link не нужен */}
				<Link href="/" className={styles.btn}>
					Return home
				</Link>
			</main>
		</>
	);
}
