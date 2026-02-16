import csv
import re
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session
from app.models.equipment import Equipment
from app.models.personnel import Personnel

DEFAULT_IMPORT_FILE = Path(__file__).resolve().parents[2] / "data" / "laptops_ns685u_r11.tsv"

def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    # Убираем неразрывные пробелы, лишние пробелы по краям
    value = value.replace("\xa0", " ").strip()
    return value or None

def _get_short_name(full_name: str) -> str:
    """Преобразует 'Иванов Иван Иванович' в 'Иванов И.И.'"""
    parts = full_name.split()
    if len(parts) >= 3:
        return f"{parts[0]} {parts[1][0]}.{parts[2][0]}."
    elif len(parts) == 2:
        return f"{parts[0]} {parts[1][0]}."
    return full_name

def _find_person(db: Session, name_from_file: str) -> Optional[Personnel]:
    """Умный поиск персонала в базе данных"""
    if not name_from_file:
        return None
    
    name_from_file = _normalize_text(name_from_file)
    
    # 1. Пробуем найти по точному совпадению (с учетом очистки пробелов)
    person = db.query(Personnel).filter(Personnel.full_name.ilike(name_from_file)).first()
    if person:
        return person

    # 2. Если в файле 'Дудин А.А.', а в базе 'Дудин Антон Александрович'
    # Ищем всех людей с такой же фамилией
    surname = name_from_file.split()[0]
    candidates = db.query(Personnel).filter(Personnel.full_name.ilike(f"{surname}%")).all()
    
    for candidate in candidates:
        # Сравниваем 'Дудин А.А.' из файла и сокращенный вариант из базы
        if _get_short_name(candidate.full_name) == name_from_file:
            return candidate
            
    return None

def _parse_bool_from_kit(kit: Optional[str], keyword: str) -> bool:
    if not kit:
        return False
    return keyword.lower() in kit.lower()

def import_laptops_to_equipment(db: Session, tsv_path: Path) -> tuple[int, int]:
    if not tsv_path.exists():
        raise FileNotFoundError(f"Файл не найден: {tsv_path}")

    inserted, updated = 0, 0

    with tsv_path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file, delimiter="\t")
        for row in reader:
            serial_number = _normalize_text(row.get("S/N"))
            if not serial_number:
                continue

            # Получаем данные из строки
            owner_name = _normalize_text(row.get("ФИО Ответственного"))
            model = _normalize_text(row.get("Модель"))
            status = _normalize_text(row.get("СТАТУС"))
            condition = _normalize_text(row.get("Состояние"))
            kit = _normalize_text(row.get("Комплектация"))
            comment = _normalize_text(row.get("Примечание"))

            # 1. Пытаемся найти владельца в существующей базе
            owner = _find_person(db, owner_name)

            # 2. Ищем или создаем оборудование
            equipment = db.query(Equipment).filter(Equipment.serial_number == serial_number).first()
            
            if equipment is None:
                equipment = Equipment(
                    serial_number=serial_number,
                    equipment_type="Ноутбук",  # Обязательное поле
                    manufacturer="Aquarius",
                    has_laptop=True,
                    is_active=True
                )
                db.add(equipment)
                inserted += 1
            else:
                updated += 1

            # 3. Обновляем поля оборудования
            equipment.model = model
            equipment.status = "На складе" if status == "На складе" else "В работе"
            equipment.current_location = "Склад" if status == "На складе" else "Выдан"
            
            # Привязываем ID найденного человека
            if owner:
                equipment.current_owner_id = owner.id
            else:
                equipment.current_owner_id = None

            # Технические детали
            equipment.laptop_functional = not (condition and "Не включается" in condition)
            equipment.has_charger = _parse_bool_from_kit(kit, "Заряд")
            equipment.has_mouse = _parse_bool_from_kit(kit, "Мыш")
            
            notes_parts = [part for part in [condition, kit, comment] if part]
            equipment.notes = " | ".join(notes_parts) if notes_parts else None

    return inserted, updated