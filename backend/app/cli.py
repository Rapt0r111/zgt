import argparse
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

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
    parsed = urlparse(db_url)

    backups_dir = Path(__file__).resolve().parents[2] / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if parsed.scheme.startswith("postgresql"):
        destination = output_path or backups_dir / f"zgt_{timestamp}.sql"
        destination.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["pg_dump", db_url, "-f", str(destination)], check=True)
        print(f"✅ Backup PostgreSQL создан: {destination}")
        return

    if parsed.scheme.startswith("sqlite"):
        raw_path = db_url.replace("sqlite:///", "", 1)
        source = Path(raw_path)
        destination = output_path or backups_dir / f"zgt_{timestamp}.sqlite3"
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        print(f"✅ Backup SQLite создан: {destination}")
        return

    raise ValueError(f"Неподдерживаемый тип БД для backup: {parsed.scheme}")


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
