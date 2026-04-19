import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.friendship import Friendship
    from app.models.project import Project
    from app.models.tag import Tag
    from app.models.task import Task


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    tag: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    internal_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)

    tags: Mapped[list["Tag"]] = relationship("Tag", back_populates="owner", foreign_keys="Tag.user_id")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="owner")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="owner")

    friendships_as_first: Mapped[list["Friendship"]] = relationship(
        "Friendship",
        foreign_keys="Friendship.user_id_1",
        back_populates="user_1",
    )
    friendships_as_second: Mapped[list["Friendship"]] = relationship(
        "Friendship",
        foreign_keys="Friendship.user_id_2",
        back_populates="user_2",
    )
