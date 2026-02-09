#!/usr/bin/env python3
"""
Скрипт для полного пересоздания базы данных и создания администратора
"""
import sys
import os

# Добавляем путь к проекту
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.personnel import Personnel
from app.models.phone import Phone
from app.models.equipment import Equipment, EquipmentMovement, StorageDevice

def reset_database():
    """Удалить и пересоздать все таблицы"""
    print("🗑️  Удаление всех таблиц...")
    
    # Удаляем все таблицы
    Base.metadata.drop_all(bind=engine)
    print("✅ Таблицы удалены")
    
    # Создаём таблицы заново
    print("🔨 Создание таблиц...")
    Base.metadata.create_all(bind=engine)
    print("✅ Таблицы созданы")


def create_admin_user():
    """Создать администратора"""
    db = SessionLocal()
    
    try:
        print("\n👤 Создание администратора...")
        
        # Проверяем, есть ли уже admin
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("⚠️  Администратор 'admin' уже существует")
            
            # Спрашиваем, нужно ли пересоздать
            response = input("Пересоздать администратора? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Отменено")
                return
            
            # Удаляем старого админа
            db.delete(existing_admin)
            db.commit()
            print("🗑️  Старый администратор удалён")
        
        # Создаём нового админа
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            full_name="Администратор системы",
            role="admin",
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("\n✅ Администратор создан успешно!")
        print("=" * 50)
        print("   Логин:  admin")
        print("   Пароль: admin123")
        print("=" * 50)
        print("⚠️  ОБЯЗАТЕЛЬНО смените пароль после первого входа!")
        
    except Exception as e:
        print(f"❌ Ошибка при создании администратора: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def verify_database():
    """Проверить, что БД корректно создана"""
    db = SessionLocal()
    
    try:
        print("\n🔍 Проверка базы данных...")
        
        # Проверяем таблицы
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
            ))
            tables = [row[0] for row in result]
            
            expected_tables = ['users', 'personnel', 'phones', 'equipment', 
                             'equipment_movements', 'storage_devices']
            
            print(f"Найдено таблиц: {len(tables)}")
            for table in sorted(tables):
                print(f"  ✓ {table}")
            
            missing = set(expected_tables) - set(tables)
            if missing:
                print(f"\n⚠️  Отсутствуют таблицы: {missing}")
            else:
                print("\n✅ Все необходимые таблицы созданы")
        
        # Проверяем администратора
        admin_count = db.query(User).filter(User.role == "admin").count()
        print(f"\n👤 Администраторов в системе: {admin_count}")
        
        if admin_count == 0:
            print("⚠️  Администраторы не найдены!")
        
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
        raise
    finally:
        db.close()


def main():
    """Главная функция"""
    print("=" * 60)
    print("ПЕРЕСОЗДАНИЕ БАЗЫ ДАННЫХ И АДМИНИСТРАТОРА")
    print("=" * 60)
    
    # Предупреждение
    print("\n⚠️  ВНИМАНИЕ! Все данные в базе будут удалены!")
    response = input("\nПродолжить? (yes/no): ")
    
    if response.lower() != 'yes':
        print("❌ Операция отменена")
        return
    
    try:
        # 1. Пересоздаём БД
        reset_database()
        
        # 2. Создаём администратора
        create_admin_user()
        
        # 3. Проверяем результат
        verify_database()
        
        print("\n" + "=" * 60)
        print("✅ ГОТОВО! База данных успешно пересоздана")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Произошла ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()