import Link from "next/link";
import styles from "../styles/error.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "404 — Страница не найдена",
};

export default function NotFound() {
	return (
		<main className={styles.errorContainer}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				className={styles.image}
				src="/error.svg"
				width={640}
				height={220}
				alt="Error 404 - Page not found"
			/>
			<h1>404</h1>
			<p>Oops! This page is lost in space.</p>
			<Link href="/" className={styles.btn}>
				Return home
			</Link>
		</main>
	);
}