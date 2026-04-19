"""Генерация строкового internal_id вида user000000000001 через PostgreSQL SEQUENCE."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

INTERNAL_ID_PREFIX = "user"
INTERNAL_ID_DIGITS = 12


def format_internal_id(sequence_value: int) -> str:
    if sequence_value < 0:
        msg = "sequence_value must be non-negative"
        raise ValueError(msg)
    max_val = 10**INTERNAL_ID_DIGITS - 1
    if sequence_value > max_val:
        msg = f"internal_id overflow: max supported value is {max_val}"
        raise ValueError(msg)
    return f"{INTERNAL_ID_PREFIX}{sequence_value:0{INTERNAL_ID_DIGITS}d}"


async def allocate_next_internal_id(session: AsyncSession) -> str:
    result = await session.execute(text("SELECT nextval('user_internal_id_seq')"))
    n = result.scalar_one()
    assert isinstance(n, int)
    return format_internal_id(n)
