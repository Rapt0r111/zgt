#!/usr/bin/env python3
"""
Миграция паролей с bcrypt на Argon2
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
import bcrypt

def migrate_passwords():
    db = SessionLocal()
    
    try:
        users = db.query(User).all()
        print(f"Найдено пользователей: {len(users)}")
        
        for user in users:
            # Проверяем, является ли хеш bcrypt (начинается с $2b$)
            if user.password_hash.startswith('$2b$'):
                print(f"Миграция пользователя: {user.username}")
                
                # Временный пароль = username (ИЗМЕНИТЬ В PRODUCTION!)
                temp_password = user.username + "123"
                
                # Новый Argon2 хеш
                user.password_hash = get_password_hash(temp_password)
                
                print(f"  ✅ {user.username} - новый пароль: {temp_password}")
        
        db.commit()
        print("\n✅ Миграция завершена!")
        print("⚠️  ВАЖНО: Все пользователи должны сменить пароли!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_passwords()