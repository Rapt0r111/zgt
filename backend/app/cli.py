import argparse
import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import generate_secure_password, get_password_hash
from app.importers.laptops_import import DEFAULT_IMPORT_FILE, import_laptops_to_equipment
from app.models.user import User


def create_admin() -> None:
    db: Session = SessionLocal()

    try:
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("❌ Пользователь 'admin' уже существует!")
            return

        temp_password = generate_secure_password()

        admin = User(
            username="admin",
            password_hash=get_password_hash(temp_password),
            full_name="Администратор системы",
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("✅ Администратор создан успешно!")
        print("=" * 60)
        print("   Логин: admin")
        print(f"   ВРЕМЕННЫЙ пароль: {temp_password}")
        print("=" * 60)
        print("   ⚠️  ЗАПИШИТЕ ПАРОЛЬ - он показан только один раз!")
        print("   ⚠️  ОБЯЗАТЕЛЬНО смените пароль после первого входа!")

    except Exception as exc:
        print(f"❌ Ошибка при создании администратора: {exc}")
        db.rollback()
    finally:
        db.close()


def import_laptops(tsv_path: Path) -> None:
    db: Session = SessionLocal()

    try:
        inserted, updated = import_laptops_to_equipment(db, tsv_path)
        db.commit()
        print(f"✅ Импорт завершён. Добавлено: {inserted}, обновлено: {updated}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def backup_database(output_path: Optional[Path]) -> None:
    db_url = settings.DATABASE_URL
    parsed = make_url(db_url)
    backend_name = parsed.get_backend_name()

    backups_dir = Path(__file__).resolve().parents[2] / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if backend_name == "postgresql":
        destination = output_path or backups_dir / f"zgt_{timestamp}.sql"
        destination.parent.mkdir(parents=True, exist_ok=True)
        command = [
            "pg_dump",
            "-h",
            parsed.host or "localhost",
            "-p",
            str(parsed.port or 5432),
            "-U",
            parsed.username or "postgres",
            "-d",
            parsed.database or "postgres",
            "-f",
            str(destination),
        ]

        env = None
        if parsed.password:
            env = dict(os.environ, PGPASSWORD=parsed.password)

        try:
            subprocess.run(command, check=True, env=env)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                "Не удалось создать backup через pg_dump. "
                "Проверьте, что PostgreSQL запущен, логин/пароль в DATABASE_URL верные, "
                "и что pg_dump доступен в PATH."
            ) from exc
        print(f"✅ Backup PostgreSQL создан: {destination}")
        return

    if backend_name == "sqlite":
        if not parsed.database:
            raise ValueError("Для SQLite не найден путь к файлу базы в DATABASE_URL")

        source = Path(parsed.database)
        destination = output_path or backups_dir / f"zgt_{timestamp}.sqlite3"
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        print(f"✅ Backup SQLite создан: {destination}")
        return

    raise ValueError(f"Неподдерживаемый тип БД для backup: {backend_name}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Утилиты администрирования ZGT")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("create-admin", help="Создать пользователя admin")

    import_parser = subparsers.add_parser("import-laptops", help="Импорт ноутбуков из TSV")
    import_parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_IMPORT_FILE,
        help=f"Путь к TSV-файлу (по умолчанию: {DEFAULT_IMPORT_FILE})",
    )

    backup_parser = subparsers.add_parser("backup-db", help="Создать backup базы данных")
    backup_parser.add_argument("--output", type=Path, default=None, help="Путь к backup файлу")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "create-admin":
        create_admin()
    elif args.command == "import-laptops":
        import_laptops(args.file)
    elif args.command == "backup-db":
        backup_database(args.output)


if __name__ == "__main__":
    main()
