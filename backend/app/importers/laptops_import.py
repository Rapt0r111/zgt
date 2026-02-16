import csv
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.models.equipment import Equipment
from app.models.personnel import Personnel

DEFAULT_IMPORT_FILE = Path(__file__).resolve().parents[2] / "data" / "laptops_ns685u_r11.tsv"


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.replace("\xa0", " ").strip()
    return value or None


def _parse_bool_from_kit(kit: Optional[str], keyword: str) -> bool:
    return bool(kit and keyword in kit)


def _map_status(raw_status: Optional[str]) -> str:
    if raw_status == "На складе":
        return "На складе"
    return "В работе"


def _find_or_create_personnel(db: Session, full_name: str, rank: Optional[str]) -> Personnel:
    person = db.query(Personnel).filter(Personnel.full_name == full_name).first()
    if person:
        if rank and not person.rank:
            person.rank = rank
        return person

    person = Personnel(full_name=full_name, rank=rank)
    db.add(person)
    db.flush()
    return person


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

            owner_name = _normalize_text(row.get("ФИО Ответственного"))
            owner_rank = _normalize_text(row.get("Звание"))
            status = _map_status(_normalize_text(row.get("СТАТУС")))
            condition = _normalize_text(row.get("Состояние"))
            kit = _normalize_text(row.get("Комплектация"))
            comment = _normalize_text(row.get("Примечание"))

            equipment = db.query(Equipment).filter(Equipment.serial_number == serial_number).first()
            if equipment is None:
                equipment = Equipment(serial_number=serial_number)
                db.add(equipment)
                inserted += 1
            else:
                updated += 1

            owner = None
            if owner_name:
                owner = _find_or_create_personnel(db, owner_name, owner_rank)

            notes_parts = [part for part in [condition, kit, comment] if part]

            equipment.equipment_type = "Ноутбук"
            equipment.manufacturer = "Aquarius"
            equipment.model = _normalize_text(row.get("Модель"))
            equipment.status = status
            equipment.current_location = "Склад" if status == "На складе" else "Выдан"
            equipment.current_owner_id = owner.id if owner else None
            equipment.has_laptop = True
            equipment.laptop_functional = not (condition and "Не включается" in condition)
            equipment.has_charger = _parse_bool_from_kit(kit, "Заряд")
            equipment.has_mouse = _parse_bool_from_kit(kit, "Мыш")
            equipment.notes = " | ".join(notes_parts) if notes_parts else None

    return inserted, updated
