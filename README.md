# Nexus — Personal Engineering Project & Schedule Manager

Веб-сервис для управления личными инженерными проектами и учебным расписанием.

## Архитектура

```
backend/          — FastAPI + SQLAlchemy (async) + PostgreSQL
frontend/         — Next.js 15 (App Router) + Tailwind CSS + Lucide Icons
docker-compose.yml — PostgreSQL 16
```

## Модули

| Модуль | Описание |
|--------|----------|
| **Core Calendar** | События с фиксированным временем (пары, встречи, дедлайны) |
| **Task Engine** | Задачи с дедлайнами и привязкой к проектам |
| **Project Hub** | Управление проектами: фазы, BOM (спецификация), прогресс |

## Быстрый старт

### 1. Запуск PostgreSQL

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API доступно на `http://localhost:8000`. Swagger-документация: `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение: `http://localhost:3000`.

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/api/projects/` | Список / создание проектов |
| GET/PATCH/DELETE | `/api/projects/{id}` | Детали / обновление / удаление проекта |
| GET | `/api/bom-items/by-project/{id}` | BOM-позиции проекта |
| POST/PATCH/DELETE | `/api/bom-items/` | CRUD для BOM |
| POST/PATCH/DELETE | `/api/phases/` | CRUD для фаз проекта |
| GET/POST | `/api/tasks/` | Список / создание задач |
| GET/PATCH/DELETE | `/api/tasks/{id}` | CRUD задачи |
| GET/POST | `/api/events/` | Список / создание событий |
| PATCH/DELETE | `/api/events/{id}` | Обновление / удаление событий |

## Структура БД

- **projects** — проекты с `tech_stack` (JSONB), статусами, ссылками
- **project_phases** — фазы с процентом прогресса
- **bom_items** — спецификация (pending → ordered → received)
- **tasks** — задачи с приоритетами и опциональной привязкой к проекту
- **events** — события календаря с типами и рекуррентностью
