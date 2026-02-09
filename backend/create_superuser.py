# create_superuser.py
from app.core.database import SessionLocal
from app.models.user import User  # Убедитесь, что путь верный
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Проверяем, есть ли уже такой пользователь
        # Если у вас поле username, замените email на username
        existing_user = db.query(User).filter(User.email == "admin").first()
        if existing_user:
            print("⚠️ Пользователь admin уже существует")
            return

        admin_user = User(
            email="admin",              # Логин
            hashed_password=get_password_hash("admin123"), # Пароль
            is_active=True,
            is_superuser=True,
            # Добавьте другие обязательные поля, если они есть в вашей модели:
            # full_name="Administrator", 
            # role="admin"
        )
        
        db.add(admin_user)
        db.commit()
        print("✅ Суперюзер создан!")
        print("👤 Логин: admin")
        print("🔑 Пароль: admin123")
        
    except Exception as e:
        print(f"❌ Ошибка при создании: {e}")
        # Если ошибка связана с отсутствием поля email, 
        # скорее всего у вас поле называется username. 
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()