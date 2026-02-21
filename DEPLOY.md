# 🚀 Инструкция по деплою ШАГ бот

## 📋 Важные ссылки и токены

### URLs приложения:
- **Frontend (Mini App)**: https://admin-topaz-seven.vercel.app
- **Backend API**: https://aura-psi-two.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard

### Токены и ключи:
```bash
BOT_TOKEN="7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo"
DATABASE_URL="postgresql://neondb_owner:npg_EK2d3sbGFnvw@ep-rapid-bread-aibhggfo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
WEBAPP_URL="https://admin-topaz-seven.vercel.app"
PORT=3000
```

---

## 🔄 Обновление на VPS (Ubuntu/Debian)

Если бот запущен на своем сервере (например `msk-1-vm`), выполни следующие шаги для обновления:

### 1. Подключение к серверу
```bash
ssh root@<IP_АДРЕС_СЕРВЕРА>
cd /Bot/DEPLOY  # Или папка где лежит бот
```

### 2. Загрузка новых файлов
Тебе нужно обновить два ключевых файла. Можно сделать это через SFTP (FileZilla) или отредактировать их на месте через `nano`.

**Файлы для обновления:**
1. `src/index.ts` — Основной код бота (API, логика)
2. `prisma/schema.prisma` — Структура базы данных (новые поля metric/value)

### 3. Обновление Базы Данных и Клиента
После того как файлы обновлены, выполни команды:

```bash
# 1. Применяем изменения в структуре БД (добавляем колонки metric, value)
npx prisma db push

# 2. Обновляем Prisma Client (чтобы код видел новые поля)
npx prisma generate
```

### 4. Сборка и Перезапуск
```bash
# Если используется сборка (TypeScript)
npm run build

# Перезапуск процесса бота
pm2 restart all

# Проверка статуса
pm2 status
pm2 logs
```

---

## 🔧 Настройка Telegram Bot Webhook
*(Если используешь Vercel для бэкенда)*

### Способ 1: Через браузер
Открой ссылку:
```
https://api.telegram.org/bot7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo/setWebhook?url=https://aura-psi-two.vercel.app
```

### Способ 2: Через PowerShell
```powershell
Invoke-WebRequest -Uri "https://api.telegram.org/bot7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo/setWebhook?url=https://aura-psi-two.vercel.app"
```

### Проверить webhook:
```
https://api.telegram.org/bot7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo/getWebhookInfo
```

---

## ⚙️ Настройка переменных окружения в Vercel

### Для Backend проекта (aura):
1. Открой: https://vercel.com/egors-projects-333b7681/aura/settings/environment-variables
2. Добавь переменные:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_EK2d3sbGFnvw@ep-rapid-bread-aibhggfo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `BOT_TOKEN` | `7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo` |
| `WEBAPP_URL` | `https://admin-topaz-seven.vercel.app` |

3. Выбери: **Production**, **Preview**, **Development**
4. Нажми **Save**
5. Redeploy проект

> **⚠️ ВАЖНО:** Для работы функции "Отчетность через чат" (отправка цифр боту) необходимо обновить код бота на сервере (`src/index.ts`) и перезапустить его.

### Для Frontend проекта (admin):
Переменные не требуются (API_URL уже захардкожен в коде)

---

## 🔄 Быстрый редеплой (Vercel)

### Backend:
```powershell
cd "c:\Users\gemer\OneDrive\Рабочий стол\ШАГ бот"
vercel --prod
```

### Frontend:
```powershell
cd "c:\Users\gemer\OneDrive\Рабочий стол\ШАГ бот\webapp"
npm run build
vercel --prod
```

---

## 🗄️ Работа с базой данных

### Применить миграции:
```powershell
cd "c:\Users\gemer\OneDrive\Рабочий стол\ШАГ бот"
npx prisma migrate deploy
```

### Сбросить базу (ВНИМАНИЕ: удалит все данные!):
```powershell
npx prisma migrate reset --force
```

### Prisma Studio (UI для БД):
```powershell
npx prisma studio
```

---

## 🔐 Система авторизации

### Endpoints:
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/verify-code` - Подтверждение кода
- `POST /api/auth/login` - Вход
- `POST /api/auth/forgot-password` - Восстановление пароля
- `POST /api/auth/reset-password` - Смена пароля

### Тестовый пользователь:
```json
{
  "login": "test_user",
  "password": "Test123!",
  "telegramId": "12345678"
}
```

---

## 🐛 Решение проблем

### Ошибка "Can't reach database":
1. Проверь что DATABASE_URL правильный
2. Проверь что база данных на Neon активна
3. Примени миграции: `npx prisma migrate deploy`

### Ошибка "Bot token invalid":
1. Проверь BOT_TOKEN в переменных Vercel
2. Обнови webhook командой выше

### Frontend не подключается к Backend:
1. Проверь что API_URL в `webapp/src/App.tsx` = `https://aura-psi-two.vercel.app/api`
2. Проверь что API_URL в `webapp/src/AuthView.tsx` = `https://aura-psi-two.vercel.app/api`
3. Пересобери frontend: `npm run build`
4. Редеплой: `vercel --prod`

---

## 📱 Подключение к Telegram

### BotFather команды:
```
/setdomain - Установить домен Mini App
Domain: https://admin-topaz-seven.vercel.app

/setmenubutton - Добавить кнопку Menu
URL: https://admin-topaz-seven.vercel.app
Text: Открыть ШАГ
```
