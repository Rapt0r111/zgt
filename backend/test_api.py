#!/usr/bin/env python3
"""
Тестирование API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Тест 1: Health check"""
    print("\n🔍 Тест 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"  Статус: {response.status_code}")
        print(f"  Ответ: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        return False

def test_cors():
    """Тест 2: CORS preflight"""
    print("\n🔍 Тест 2: CORS Preflight")
    try:
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        print(f"  Статус: {response.status_code}")
        
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
        }
        
        print("  CORS заголовки:")
        for key, value in cors_headers.items():
            status = "✅" if value else "❌"
            print(f"    {status} {key}: {value}")
        
        return all(cors_headers.values())
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        return False

def test_login():
    """Тест 3: Login"""
    print("\n🔍 Тест 3: Login")
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        print(f"  Статус: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Токен получен: {data.get('access_token', '')[:30]}...")
            
            # Проверка cookie
            cookies = response.cookies
            if "access_token" in cookies:
                print(f"  ✅ Cookie установлен")
            else:
                print(f"  ❌ Cookie НЕ установлен")
                print(f"  Cookies: {cookies}")
            
            # Проверка Set-Cookie заголовка
            set_cookie = response.headers.get("Set-Cookie")
            if set_cookie:
                print(f"  ✅ Set-Cookie header: {set_cookie[:50]}...")
            else:
                print(f"  ❌ Set-Cookie header отсутствует")
            
            return True
        else:
            print(f"  ❌ Ошибка: {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        return False

def test_auth_me():
    """Тест 4: Get current user"""
    print("\n🔍 Тест 4: Get Current User (с токеном)")
    try:
        # Сначала получаем токен
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        
        if login_response.status_code != 200:
            print("  ❌ Не удалось получить токен")
            return False
        
        token = login_response.json()["access_token"]
        
        # Тестируем /me с токеном
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"  Статус: {response.status_code}")
        
        if response.status_code == 200:
            user = response.json()
            print(f"  ✅ Пользователь: {user['username']} ({user['full_name']})")
            return True
        else:
            print(f"  ❌ Ошибка: {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        return False

def main():
    print("=" * 70)
    print("ДИАГНОСТИКА API")
    print("=" * 70)
    print(f"Backend URL: {BASE_URL}")
    
    results = {
        "Health Check": test_health(),
        "CORS": test_cors(),
        "Login": test_login(),
        "Auth /me": test_auth_me(),
    }
    
    print("\n" + "=" * 70)
    print("РЕЗУЛЬТАТЫ:")
    print("=" * 70)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {status} - {test_name}")
    
    print("=" * 70)
    
    if all(results.values()):
        print("\n✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("\nЕсли вход всё ещё не работает:")
        print("  1. Очистите кэш браузера")
        print("  2. Откройте DevTools → Network")
        print("  3. Проверьте запрос к /api/auth/login")
        print("  4. Убедитесь что frontend обращается к http://localhost:8000")
    else:
        print("\n❌ ЕСТЬ ОШИБКИ - ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ")
        print("\nПримените исправления из FIX_LOGIN_ISSUE.md")

if __name__ == "__main__":
    main()
