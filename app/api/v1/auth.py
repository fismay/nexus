from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import user as user_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import RegisterResponse, Token, UserCreate, UserLogin, UserRead
from app.security import create_access_token, verify_password

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)) -> RegisterResponse:
    if await user_crud.get_by_email(db, data.email.lower().strip()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email уже зарегистрирован")
    if await user_crud.get_by_tag(db, data.tag):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Тег уже занят")
    try:
        user = await user_crud.create_user(db, data)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Конфликт уникальности (email или тег)",
        ) from None
    token = create_access_token(str(user.id))
    return RegisterResponse(
        user=UserRead.model_validate(user),
        access_token=token,
        token_type="bearer",
    )


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)) -> Token:
    user = await user_crud.get_by_email(db, data.email.lower().strip())
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль")
    token = create_access_token(str(user.id))
    return Token(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserRead)
async def me(current: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current)
