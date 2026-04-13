import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tech_stack: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(
        String(30), default="planning"
    )  # planning | active | on_hold | completed | archived
    project_type: Mapped[str] = mapped_column(
        String(30), default="general"
    )  # dev | music | business | hardware | general
    repository_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cad_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    bom_items: Mapped[list["BOMItem"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
    phases: Mapped[list["ProjectPhase"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="project", lazy="selectin"
    )

    @property
    def overall_progress(self) -> float:
        if not self.phases:
            return 0.0
        return sum(p.progress_percent for p in self.phases) / len(self.phases)


from app.models.bom_item import BOMItem  # noqa: E402
from app.models.project_phase import ProjectPhase  # noqa: E402
from app.models.task import Task  # noqa: E402
