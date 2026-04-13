import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, Integer, Float, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

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
    event_type: Mapped[str] = mapped_column(
        String(30), default="class"
    )  # class | meeting | work_block | deadline | other
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # iCal Import fields
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    ical_uid: Mapped[str | None] = mapped_column(String(500), nullable=True, unique=True)
    smart_tag: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # @theory | @practice
    week_parity: Mapped[str | None] = mapped_column(
        String(15), nullable=True
    )  # numerator | denominator — числитель/знаменатель
    recurrence_interval: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # INTERVAL из RRULE (2 = раз в 2 недели)

    # Stones & Sand: fixed vs fluid
    scheduling_type: Mapped[str] = mapped_column(
        String(20), default="fixed"
    )  # fixed | fluid

    # Smart Routing: geo-fields
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    project: Mapped["Project | None"] = relationship()


from app.models.project import Project  # noqa: E402
