import enum


class ProjectCategory(str, enum.Enum):
    music = "Музыка"
    business = "Бизнес"
    study = "Учеба"
    work = "Работа"
    custom = "Кастомное"


class TaskStatus(str, enum.Enum):
    planned = "planned"
    completed = "completed"


class TaskKind(str, enum.Enum):
    task = "task"
    meeting = "meeting"
    event = "event"


class ProjectAssetKind(str, enum.Enum):
    prompt = "prompt"
    link = "link"


class FriendshipStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    blocked = "blocked"
