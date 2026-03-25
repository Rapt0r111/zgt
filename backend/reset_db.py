#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import sync_engine, SessionLocal, Base  # ← sync_engine
from app.core.security import get_password_hash
from app.models.user import User
# Импортируем все модели, чтобы Base.metadata знал о них
from app.models.personnel import Personnel          # noqa: F401
from app.models.phone import Phone                  # noqa: F401
from app.models.equipment import Equipment, EquipmentMovement, StorageDevice  # noqa: F401
from app.models.storage_and_passes import StorageAndPass  # noqa: F401


def reset_database() -> None:
    print("🗑️  Удаление всех таблиц...")
    Base.metadata.drop_all(bind=sync_engine)
    print("✅ Таблицы удалены")

    print("🔨 Создание таблиц...")
    Base.metadata.create_all(bind=sync_engine)
    print("✅ Таблицы созданы")


def create_admin_user() -> None:
    db = SessionLocal()
    try:
        print("\n👤 Создание администратора...")

        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("⚠️  Администратор 'admin' уже существует")
            response = input("Пересоздать администратора? (yes/no): ")
            if response.lower() != "yes":
                print("❌ Отменено")
                return
            db.delete(existing_admin)
            db.commit()

        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            full_name="Администратор системы",
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("\n✅ Администратор создан!")
        print("   Логин:  admin")
        print("   Пароль: admin123")
        print("   ⚠️  Смените пароль после первого входа!")

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()


def main() -> None:
    print("=" * 60)
    print("ПЕРЕСОЗДАНИЕ БАЗЫ ДАННЫХ")
    print("=" * 60)

    print("\n⚠️  ВНИМАНИЕ! Все данные в базе будут удалены!")
    response = input("\nПродолжить? (yes/no): ")

    if response.lower() != "yes":
        print("❌ Операция отменена")
        return

    try:
        reset_database()
        create_admin_user()
        print("\n✅ ГОТОВО!")
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()