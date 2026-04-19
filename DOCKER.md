# Nexus: Docker

## Состав

- **db** — PostgreSQL 16
- **api** — FastAPI (`uvicorn`, порт 8000)
- **web** — Next.js (standalone, порт 3000)

## Запуск

Из корня репозитория:

```bash
docker compose up --build -d
```

- Веб: http://localhost:3000  
- API: http://localhost:8000  
- Swagger: http://localhost:8000/docs  

Переменная `NEXT_PUBLIC_API_URL` для браузера указывает на `http://localhost:8000` (хост-машина).

## Остановка

```bash
docker compose down
```

Данные PostgreSQL сохраняются в volume `nexus_pg`.

## Тестирование API

1. Регистрация и логин (два пользователя), создание дружбы со статусом `accepted` в БД (эндпоинта дружбы пока может не быть — тогда вставьте строку в `friendships` вручную или через SQL).
2. Создайте задачи на один день у обоих пользователей.
3. Запрос (подставьте `FRIEND_ID` и токен):

```bash
curl -s "http://localhost:8000/api/friends/FRIEND_ID/match-schedule?date=2026-04-17" ^
  -H "Authorization: Bearer YOUR_JWT"
```

Ответ: `free_slots` — массив `{ start, end }` в UTC.

## UI

- Мэтчинг: `/friends/{friendId}/match` — введите Bearer token и дату.
- Проект (макет вкладок): `/projects/{projectId}`
