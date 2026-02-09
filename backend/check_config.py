#!/usr/bin/env python3
"""
Проверка текущей конфигурации CORS и cookies
"""
import os
import sys

def check_file(filepath, checks):
    """Проверить содержимое файла"""
    print(f"\n📄 Проверяю {filepath}...")
    
    if not os.path.exists(filepath):
        print(f"  ❌ Файл не найден!")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    all_ok = True
    for check_name, search_text in checks.items():
        if search_text in content:
            print(f"  ✅ {check_name}")
        else:
            print(f"  ❌ {check_name} - НЕ НАЙДЕНО")
            all_ok = False
    
    return all_ok

def main():
    print("=" * 70)
    print("ПРОВЕРКА КОНФИГУРАЦИИ BACKEND")
    print("=" * 70)
    
    # Проверка main.py
    main_checks = {
        "allow_credentials=True": "allow_credentials=True",
        'allow_methods=["*"]': 'allow_methods=["*"]',
        'allow_headers=["*"]': 'allow_headers=["*"]',
    }
    
    main_ok = check_file("app/main.py", main_checks)
    
    # Проверка auth.py
    auth_checks = {
        "secure=False": "secure=False",
        "httponly=True": "httponly=True",
        'samesite="lax"': 'samesite="lax"',
    }
    
    auth_ok = check_file("app/api/routes/auth.py", auth_checks)
    
    print("\n" + "=" * 70)
    if main_ok and auth_ok:
        print("✅ ВСЕ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ")
        print("\nТеперь:")
        print("  1. Перезапустите backend (Ctrl+C, затем снова uvicorn)")
        print("  2. Очистите кэш браузера (DevTools → Application → Clear)")
        print("  3. Попробуйте войти: admin / admin123")
    else:
        print("❌ ТРЕБУЕТСЯ ПРИМЕНИТЬ ИСПРАВЛЕНИЯ")
        print("\nПримените исправленные файлы:")
        print("  - main.py → backend/app/main.py")
        print("  - auth.py → backend/app/api/routes/auth.py")
    print("=" * 70)

if __name__ == "__main__":
    main()
