from pydantic import BaseModel


class ScheduledSlot(BaseModel):
    task_id: str
    task_title: str
    start_time: str
    end_time: str
    energy_cost: int


class AiScheduleResponse(BaseModel):
    scheduled: list[ScheduledSlot]
    message: str
    unscheduled_count: int
