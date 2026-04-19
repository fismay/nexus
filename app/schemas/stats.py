from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    tasks_created_last_7_days: int = Field(ge=0)
    tasks_completed_last_7_days: int = Field(ge=0)
