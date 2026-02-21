# 🚀 Запуск через Telegram бота (локально)

## Шаг 1: Установи ngrok (если ещё не установлен)

1. Скачай: https://ngrok.com/download
2. Распакуй в любую папку
3. Зарегистрируйся на ngrok.com и получи authtoken
4. Запусти: `ngrok authtoken ТВОЙ_ТОКЕН`

## Шаг 2: Запусти backend

```powershell
# В первом терминале
cd "c:\Users\gemer\OneDrive\Рабочий стол\ШАГ бот"
npm run dev
```

Должно появиться:
```
Бот и API запущены!
API Server running on port 3000
```

## Шаг 3: Запусти ngrok для backend

```powershell
# Во втором терминале
ngrok http 3000
```

Скопируй URL (например: `https://abc123.ngrok.io`)

## Шаг 4: Обнови webhook бота

Замени `YOUR_NGROK_URL` на твой ngrok URL:

```powershell
Invoke-WebRequest -Uri "https://api.telegram.org/bot7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo/setWebhook?url=YOUR_NGROK_URL"
```

Пример:
```powershell
Invoke-WebRequest -Uri "https://api.telegram.org/bot7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo/setWebhook?url=https://abc123.ngrok.io"
```

## Шаг 5: Запусти frontend

```powershell
# В третьем терминале
cd "c:\Users\gemer\OneDrive\Рабочий стол\ШАГ бот\webapp"
npm run dev
```

Frontend откроется на `http://localhost:5173`

## Шаг 6: Запусти ngrok для frontend

```powershell
# В четвёртом терминале
ngrok http 5173
```

Скопируй URL (например: `https://xyz789.ngrok.io`)

## Шаг 7: Настрой бота в BotFather

1. Открой @BotFather в Telegram
2. Отправь: `/mybots`
3. Выбери своего бота
4. **Bot Settings** → **Menu Button**
5. **Configure Menu Button** → **Edit Menu Button URL**
6. Вставь ngrok URL фронтенда (из Шага 6)

## Готово! 🎉

Теперь открой бота в Telegram и нажми кнопку Menu - откроется твоё приложение!

---

## ⚡ Быстрая перезагрузка

Если перезапустил ngrok и получил новые URLs:

1. **Backend ngrok URL изменился?**
   - Обнови webhook (Шаг 4)

2. **Frontend ngrok URL изменился?**
   - Обнови Menu Button в BotFather (Шаг 7)

---

## 🔧 Альтернатива: localtunnel (проще чем ngrok)

```powershell
# Установи
npm install -g localtunnel

# Backend
lt --port 3000 --subdomain shag-bot-api

# Frontend
lt --port 5173 --subdomain shag-bot-app
```

URLs будут:
- Backend: `https://shag-bot-api.loca.lt`
- Frontend: `https://shag-bot-app.loca.lt`

---

## 📱 Тестирование

1. Открой бота в Telegram
2. Нажми кнопку Menu (внизу у поля ввода)
3. Откроется твоё приложение
4. Зарегистрируйся (код придёт в Telegram)
5. Войди и пользуйся!
