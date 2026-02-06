import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User

def create_admin():
    """Создать первого администратора"""
    db: Session = SessionLocal()
    
    try:
        # Проверить, есть ли уже админ
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("❌ Пользователь 'admin' уже существует!")
            return
        
        # Создать админа
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),  # ИЗМЕНИТЬ В PRODUCTION!
            full_name="Администратор системы",
            role="admin",
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Администратор создан успешно!")
        print(f"   Логин: admin")
        print(f"   Пароль: admin123")
        print(f"   ⚠️  ОБЯЗАТЕЛЬНО смените пароль после первого входа!")
        
    except Exception as e:
        print(f"❌ Ошибка при создании администратора: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "create-admin":
        create_admin()
    else:
        print("Использование: python -m app.cli create-admin")