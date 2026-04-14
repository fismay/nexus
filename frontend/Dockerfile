FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Не задаём NEXT_PUBLIC_API_URL — в браузере используется относительный /api (прокси в app/api/[[...path]]/route.ts).
ARG BACKEND_ORIGIN=http://backend:8000
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN
ENV INTERNAL_API_URL=http://backend:8000/api

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
