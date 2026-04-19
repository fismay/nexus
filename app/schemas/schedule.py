from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.schemas.task import TaskRead


class HourSlot(BaseModel):
    hour: int = Field(ge=0, le=23)
    task_ids: list[str]
    has_critical_conflict: bool


class DaySchedule(BaseModel):
    date: date
    tasks: list[TaskRead]
    hours: list[HourSlot]


class ScheduleResponse(BaseModel):
    start_date: date
    end_date: date
    days: list[DaySchedule]


class IcalImportBody(BaseModel):
    url: str | None = Field(default=None, description="URL до .ics (загрузка на сервере)")
    ical_text: str | None = Field(
        default=None,
        description="Сырой текст календаря (если фронт скачал .ics в браузере или вставка вручную)",
    )

    @model_validator(mode="before")
    @classmethod
    def strip_ical_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            u = data.get("url")
            if isinstance(u, str):
                u = u.strip() or None
                data["url"] = u
            t = data.get("ical_text")
            if isinstance(t, str):
                t = t.strip() or None
                data["ical_text"] = t
        return data

    @model_validator(mode="after")
    def url_or_ical(self) -> "IcalImportBody":
        has_url = self.url is not None and self.url != ""
        has_ical = self.ical_text is not None and self.ical_text != ""
        if has_url == has_ical:
            raise ValueError("Укажите ровно одно: url или ical_text")
        return self


class IcalImportResponse(BaseModel):
    created: int
    skipped: int
