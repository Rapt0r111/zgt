"""init

Revision ID: eb8934c1075d
Revises: 
Create Date: 2026-03-30 16:09:29.302988

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb8934c1075d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ── ENUM: personnelstatus ────────────────────────────────────────────────
    personnelstatus = sa.Enum(
        'IN_SERVICE', 'ON_MISSION', 'IN_HOSPITAL', 'ON_LEAVE',
        name='personnelstatus'
    )

    # ── TABLE: users ─────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # ── TABLE: personnel ─────────────────────────────────────────────────────
    op.create_table(
        'personnel',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('rank', sa.String(), nullable=True),
        sa.Column('rank_priority', sa.Integer(), nullable=True),
        sa.Column('position', sa.String(), nullable=True),
        sa.Column('platoon', sa.String(), nullable=True),
        sa.Column('personal_number', sa.String(), nullable=True),
        sa.Column('service_number', sa.String(), nullable=True),
        sa.Column('security_clearance_level', sa.Integer(), nullable=True),
        sa.Column('clearance_order_number', sa.String(), nullable=True),
        sa.Column('clearance_expiry_date', sa.DateTime(), nullable=True),
        sa.Column('status', personnelstatus, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_personnel_id', 'personnel', ['id'], unique=False)
    op.create_index('ix_personnel_full_name', 'personnel', ['full_name'], unique=False)
    op.create_index('ix_personnel_personal_number', 'personnel', ['personal_number'], unique=True)
    op.create_index('ix_personnel_service_number', 'personnel', ['service_number'], unique=True)

    # ── TABLE: phones ─────────────────────────────────────────────────────────
    op.create_table(
        'phones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('model', sa.String(length=255), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('imei_1', sa.String(length=15), nullable=True),
        sa.Column('imei_2', sa.String(length=15), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('has_camera', sa.Boolean(), nullable=True),
        sa.Column('has_recorder', sa.Boolean(), nullable=True),
        sa.Column('storage_location', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            
            nullable=True,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            
            nullable=True,
        ),
        sa.ForeignKeyConstraint(['owner_id'], ['personnel.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('imei_1', name='uq_phone_imei_1'),
    )
    op.create_index('ix_phones_id', 'phones', ['id'], unique=False)
    op.create_index('ix_phones_imei_1', 'phones', ['imei_1'], unique=False)

    # ── TABLE: equipment ─────────────────────────────────────────────────────
    op.create_table(
        'equipment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('equipment_type', sa.String(length=50), nullable=False),
        sa.Column('inventory_number', sa.String(length=100), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('mni_serial_number', sa.String(length=100), nullable=True),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=255), nullable=True),
        sa.Column('cpu', sa.String(length=255), nullable=True),
        sa.Column('ram_gb', sa.Integer(), nullable=True),
        sa.Column('storage_type', sa.String(length=50), nullable=True),
        sa.Column('storage_capacity_gb', sa.Integer(), nullable=True),
        sa.Column('has_optical_drive', sa.Boolean(), nullable=True),
        sa.Column('has_card_reader', sa.Boolean(), nullable=True),
        sa.Column('has_laptop', sa.Boolean(), nullable=True),
        sa.Column('laptop_functional', sa.Boolean(), nullable=True),
        sa.Column('has_charger', sa.Boolean(), nullable=True),
        sa.Column('charger_functional', sa.Boolean(), nullable=True),
        sa.Column('has_mouse', sa.Boolean(), nullable=True),
        sa.Column('mouse_functional', sa.Boolean(), nullable=True),
        sa.Column('has_bag', sa.Boolean(), nullable=True),
        sa.Column('bag_functional', sa.Boolean(), nullable=True),
        sa.Column('operating_system', sa.String(length=100), nullable=True),
        sa.Column('current_owner_id', sa.Integer(), nullable=True),
        sa.Column('current_location', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_personal', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['current_owner_id'], ['personnel.id'], ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('inventory_number', name='uq_equipment_inventory'),
    )
    op.create_index('ix_equipment_id', 'equipment', ['id'], unique=False)
    op.create_index('ix_equipment_inventory_number', 'equipment', ['inventory_number'], unique=False)
    op.create_index('ix_equipment_serial_number', 'equipment', ['serial_number'], unique=False)
    op.create_index('ix_equipment_mni_serial_number', 'equipment', ['mni_serial_number'], unique=False)
    op.create_index('ix_equipment_current_owner_id', 'equipment', ['current_owner_id'], unique=False)
    op.create_index('ix_equipment_is_personal', 'equipment', ['is_personal'], unique=False)

    # ── TABLE: equipment_movements ────────────────────────────────────────────
    op.create_table(
        'equipment_movements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('equipment_id', sa.Integer(), nullable=False),
        sa.Column('from_location', sa.String(length=255), nullable=True),
        sa.Column('to_location', sa.String(length=255), nullable=True),
        sa.Column('from_person_id', sa.Integer(), nullable=True),
        sa.Column('to_person_id', sa.Integer(), nullable=True),
        sa.Column('movement_type', sa.String(length=50), nullable=True),
        sa.Column('document_number', sa.String(length=100), nullable=True),
        sa.Column('document_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ['equipment_id'], ['equipment.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(['from_person_id'], ['personnel.id']),
        sa.ForeignKeyConstraint(['to_person_id'], ['personnel.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_equipment_movements_id', 'equipment_movements', ['id'], unique=False)
    op.create_index('ix_equipment_movements_equipment_id', 'equipment_movements', ['equipment_id'], unique=False)
    op.create_index('ix_equipment_movements_from_person_id', 'equipment_movements', ['from_person_id'], unique=False)
    op.create_index('ix_equipment_movements_to_person_id', 'equipment_movements', ['to_person_id'], unique=False)

    # ── TABLE: storage_devices ────────────────────────────────────────────────
    op.create_table(
        'storage_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('equipment_id', sa.Integer(), nullable=True),
        sa.Column('device_type', sa.String(length=50), nullable=False),
        sa.Column('inventory_number', sa.String(length=100), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=255), nullable=True),
        sa.Column('capacity_gb', sa.Integer(), nullable=True),
        sa.Column('interface', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['equipment_id'], ['equipment.id'], ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('inventory_number', name='uq_storage_inventory'),
    )
    op.create_index('ix_storage_devices_id', 'storage_devices', ['id'], unique=False)
    op.create_index('ix_storage_devices_inventory_number', 'storage_devices', ['inventory_number'], unique=False)
    op.create_index('ix_storage_devices_serial_number', 'storage_devices', ['serial_number'], unique=False)
    op.create_index('ix_storage_devices_equipment_id', 'storage_devices', ['equipment_id'], unique=False)

    # ── TABLE: storage_and_passes ─────────────────────────────────────────────
    op.create_table(
        'storage_and_passes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_type', sa.String(length=50), nullable=False),
        sa.Column('serial_number', sa.String(length=100), nullable=False),
        sa.Column('model', sa.String(length=255), nullable=True),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('capacity_gb', sa.Integer(), nullable=True),
        sa.Column('access_level', sa.Integer(), nullable=True),
        sa.Column('issue_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('return_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('UTC', now())"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "asset_type IN ('flash_drive', 'electronic_pass')",
            name='ck_asset_type',
        ),
        sa.CheckConstraint(
            "status IN ('in_use', 'stock', 'broken', 'lost')",
            name='ck_status',
        ),
        sa.ForeignKeyConstraint(
            ['assigned_to_id'], ['personnel.id'], ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('serial_number', name='uq_storage_passes_serial'),
    )
    op.create_index('ix_storage_and_passes_id', 'storage_and_passes', ['id'], unique=False)
    op.create_index('ix_storage_and_passes_serial_number', 'storage_and_passes', ['serial_number'], unique=False)
    op.create_index('ix_storage_and_passes_assigned_to_id', 'storage_and_passes', ['assigned_to_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    # Удаляем таблицы в обратном порядке (с учётом FK)
    op.drop_index('ix_storage_and_passes_assigned_to_id', table_name='storage_and_passes')
    op.drop_index('ix_storage_and_passes_serial_number', table_name='storage_and_passes')
    op.drop_index('ix_storage_and_passes_id', table_name='storage_and_passes')
    op.drop_table('storage_and_passes')

    op.drop_index('ix_storage_devices_equipment_id', table_name='storage_devices')
    op.drop_index('ix_storage_devices_serial_number', table_name='storage_devices')
    op.drop_index('ix_storage_devices_inventory_number', table_name='storage_devices')
    op.drop_index('ix_storage_devices_id', table_name='storage_devices')
    op.drop_table('storage_devices')

    op.drop_index('ix_equipment_movements_to_person_id', table_name='equipment_movements')
    op.drop_index('ix_equipment_movements_from_person_id', table_name='equipment_movements')
    op.drop_index('ix_equipment_movements_equipment_id', table_name='equipment_movements')
    op.drop_index('ix_equipment_movements_id', table_name='equipment_movements')
    op.drop_table('equipment_movements')

    op.drop_index('ix_equipment_is_personal', table_name='equipment')
    op.drop_index('ix_equipment_current_owner_id', table_name='equipment')
    op.drop_index('ix_equipment_mni_serial_number', table_name='equipment')
    op.drop_index('ix_equipment_serial_number', table_name='equipment')
    op.drop_index('ix_equipment_inventory_number', table_name='equipment')
    op.drop_index('ix_equipment_id', table_name='equipment')
    op.drop_table('equipment')

    op.drop_index('ix_phones_imei_1', table_name='phones')
    op.drop_index('ix_phones_id', table_name='phones')
    op.drop_table('phones')

    op.drop_index('ix_personnel_service_number', table_name='personnel')
    op.drop_index('ix_personnel_personal_number', table_name='personnel')
    op.drop_index('ix_personnel_full_name', table_name='personnel')
    op.drop_index('ix_personnel_id', table_name='personnel')
    op.drop_table('personnel')

    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')

    sa.Enum(name='personnelstatus').drop(op.get_bind(), checkfirst=True)