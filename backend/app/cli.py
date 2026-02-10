import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash, generate_secure_password
from app.models.user import User

def create_admin():
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
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Администратор создан успешно!")
        print("=" * 60)
        print(f"   Логин: admin")
        print(f"   ВРЕМЕННЫЙ пароль: {temp_password}")
        print("=" * 60)
        print(f"   ⚠️  ЗАПИШИТЕ ПАРОЛЬ - он показан только один раз!")
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