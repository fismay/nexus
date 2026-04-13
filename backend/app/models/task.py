import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, Integer, Float, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(
        String(20), default="medium"
    )  # low | medium | high | critical
    status: Mapped[str] = mapped_column(
        String(20), default="todo"
    )  # todo | in_progress | blocked | done
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Фича 2: Timeboxing — привязка к слоту в календаре
    start_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Фича 3: Hardware Blockers — задача блокируется деталью из BOM
    blocker_bom_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bom_items.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Фича 4: Context Tags — массив контекстных тегов
    context_tags: Mapped[list] = mapped_column(JSONB, default=list)

    # Stamina Bar
    energy_cost: Mapped[int] = mapped_column(Integer, default=2)

    # Stones & Sand: fixed vs fluid
    scheduling_type: Mapped[str] = mapped_column(
        String(20), default="fluid"
    )  # fixed | fluid

    # Smart Routing: geo-fields
    location_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project | None"] = relationship(back_populates="tasks")
    blocker_bom_item: Mapped["BOMItem | None"] = relationship(
        foreign_keys=[blocker_bom_item_id], lazy="selectin"
    )


from app.models.project import Project  # noqa: E402
from app.models.bom_item import BOMItem  # noqa: E402
