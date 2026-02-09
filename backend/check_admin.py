#!/usr/bin/env python3
"""
Скрипт для проверки пользователя admin и его пароля
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password, get_password_hash

def check_admin():
    """Проверить пользователя admin"""
    db = SessionLocal()
    
    try:
        # Найти админа
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("❌ Пользователь 'admin' не найден!")
            print("Создаю администратора...")
            
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
            
            print("✅ Администратор создан!")
            print(f"   Логин: admin")
            print(f"   Пароль: admin123")
            return
        
        print("✅ Пользователь 'admin' найден")
        print(f"   ID: {admin.id}")
        print(f"   ФИО: {admin.full_name}")
        print(f"   Роль: {admin.role}")
        print(f"   Активен: {admin.is_active}")
        
        # Проверить пароль
        test_password = "admin123"
        if verify_password(test_password, admin.password_hash):
            print(f"✅ Пароль '{test_password}' корректен")
        else:
            print(f"❌ Пароль '{test_password}' НЕ подходит!")
            print("Сбрасываю пароль на 'admin123'...")
            
            admin.password_hash = get_password_hash("admin123")
            db.commit()
            
            print("✅ Пароль сброшен на 'admin123'")
        
        # Проверить активность
        if not admin.is_active:
            print("⚠️  Пользователь деактивирован! Активирую...")
            admin.is_active = True
            db.commit()
            print("✅ Пользователь активирован")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ ADMIN")
    print("=" * 60)
    print()
    check_admin()
    print()
    print("=" * 60)
