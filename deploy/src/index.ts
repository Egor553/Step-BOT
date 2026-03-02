import { Telegraf, Markup } from 'telegraf';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import prisma from './db';
import cron from 'node-cron';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '');
const app = express();

// --- MIDDLEWARE ---
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
}));
app.use(express.json());

// Хелпер для BigInt -> JSON
const toJSON = (obj: any) => JSON.parse(JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? v.toString() : v));

// ======================================================
// 1. API: ПОЛЬЗОВАТЕЛИ (авторизация только через Telegram ID)
// ======================================================

// Получить или создать пользователя по Telegram ID
app.get('/api/user/:tgId', async (req: Request, res: Response) => {
    try {
        const tgId = BigInt(req.params.tgId as string);
        const firstName = (req.query.firstName as string) || null;
        const username = (req.query.username as string) || null;

        // Создаём или обновляем — всегда синхронизируем имя из Telegram
        const user = await prisma.user.upsert({
            where: { telegramId: tgId },
            update: {
                // Всегда обновляем из Telegram, если данные пришли
                ...(firstName ? { firstName } : {}),
                ...(username ? { username } : {})
            },
            create: {
                telegramId: tgId,
                isVerified: true,
                firstName,
                username
            },
            include: {
                goals: {
                    orderBy: { startDate: 'desc' },
                    include: { steps: { orderBy: { createdAt: 'desc' } } }
                }
            }
        });

        console.log(`[USER] ${user.firstName} (@${user.username}) — ID: ${tgId}`);
        res.json(toJSON(user));
    } catch (e) {
        console.error('[USER] Error:', e);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Сохранить/обновить профиль
app.post('/api/user/profile', async (req: Request, res: Response) => {
    const { telegramId, firstName, lastName, occupation, phone, notificationTime } = req.body;
    try {
        const tgId = BigInt(telegramId.toString());
        console.log(`[PROFILE] Сохранение для ${tgId}: ${firstName}`);

        const user = await prisma.user.upsert({
            where: { telegramId: tgId },
            update: { firstName, lastName, occupation, phone, notificationTime, isVerified: true },
            create: { telegramId: tgId, firstName, lastName, occupation, phone, notificationTime, isVerified: true }
        });

        res.json({ success: true, user: toJSON(user) });
    } catch (e) {
        console.error('[PROFILE] Error:', e);
        res.status(500).json({ error: 'Ошибка сохранения профиля' });
    }
});

// Статистика платформы (для вкладки Аналитика)
app.get('/api/stats', async (req: Request, res: Response) => {
    try {
        const [totalUsers, usersWithGoals, totalGoals, activeGoals, completedGoals, totalSteps] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { goals: { some: {} } } }),
            prisma.goal.count(),
            prisma.goal.count({ where: { status: 'ACTIVE' } }),
            prisma.goal.count({ where: { status: 'COMPLETED' } }),
            prisma.step.count()
        ]);

        // Находим рекордсмена (цель с макс. кол-вом шагов)
        const recordGoalRaw = await prisma.goal.findFirst({
            orderBy: { steps: { _count: 'desc' } },
            include: { user: true, _count: { select: { steps: true } } }
        });

        const recordGoal = recordGoalRaw ? {
            description: recordGoalRaw.description,
            firstName: recordGoalRaw.user.firstName,
            username: recordGoalRaw.user.username,
            stepsCount: recordGoalRaw._count.steps
        } : null;

        res.json({
            totalUsers,
            usersWithGoals,
            totalGoals,
            activeGoals,
            completedGoals,
            totalSteps,
            recordGoal
        });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});


// ======================================================
// 2. API: ЦЕЛИ
// ======================================================

app.post('/api/goals', async (req: Request, res: Response) => {
    const { telegramId, description, duration, category, metric, customDeadline } = req.body;
    console.log(`[GOAL-START] Body:`, req.body);

    try {
        if (!telegramId) return res.status(400).json({ error: 'No Telegram ID' });

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId.toString()) }
        });

        if (!user) {
            console.error(`[GOAL-ERROR] User not found for ID: ${telegramId}`);
            return res.status(404).json({ error: 'User not found' });
        }

        let deadline: Date;
        if (customDeadline) {
            deadline = new Date(customDeadline);
        } else {
            deadline = new Date();
            if (Number(duration) > 0) {
                deadline.setMonth(deadline.getMonth() + Number(duration));
            }
        }

        const goal = await prisma.goal.create({
            data: {
                userId: user.id,
                description,
                category: category || 'PERSONAL',
                duration: Number(duration) || 0,
                deadline,
                metric: metric || null,
                status: 'ACTIVE'
            }
        });

        console.log(`[GOAL-SUCCESS] Created: #${goal.id}`);
        res.json(goal);
    } catch (e: any) {
        console.error('[GOAL-FATAL-ERROR]:', e.message, e);
        res.status(500).json({ error: `Server Error: ${e.message}` });
    }
});

// Удалить цель (и все шаги)
app.delete('/api/goals/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await prisma.step.deleteMany({ where: { goalId: id } });
        await prisma.goal.delete({ where: { id } });
        console.log(`[GOAL] Удалена цель #${id}`);
        res.json({ success: true });
    } catch (e) {
        console.error('[GOAL DELETE] Error:', e);
        res.status(500).json({ error: 'Error' });
    }
});

// ======================================================
// 3. API: ШАГИ
// ======================================================

// Добавить шаг
app.post('/api/steps', async (req: Request, res: Response) => {
    const { goalId, content, evaluation, isKey, value } = req.body;
    try {
        const step = await prisma.step.create({
            data: {
                goalId: Number(goalId),
                content,
                evaluation,
                isKey: Boolean(isKey),
                value: value ? parseFloat(value.toString()) : null
            }
        });
        res.json(step);
    } catch (e) {
        console.error('[STEP] Error:', e);
        res.status(500).json({ error: 'Error' });
    }
});

// Редактировать шаг
app.put('/api/steps/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { content, evaluation, value } = req.body;
    try {
        const step = await prisma.step.update({
            where: { id },
            data: { content, evaluation, value: value ? parseFloat(value.toString()) : undefined }
        });
        res.json(step);
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

// Удалить шаг
app.delete('/api/steps/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        await prisma.step.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

// ======================================================
// 4. API: ИДЕИ и ЗАПРОСЫ
// ======================================================

app.post('/api/ideas', async (req: Request, res: Response) => {
    const { telegramId, content, username } = req.body;
    try {
        await prisma.idea.create({
            data: { telegramId: BigInt(telegramId.toString()), username: username || null, content }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/requests', async (req: Request, res: Response) => {
    const { telegramId, type, content, username } = req.body;
    try {
        await prisma.request.create({
            data: { telegramId: BigInt(telegramId.toString()), username: username || null, type, content }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

// ======================================================
// 5. БОТ: Команды
// ======================================================

// /start — ЕДИНСТВЕННАЯ точка входа
bot.start(async (ctx) => {
    const tgId = ctx.from.id;
    const username = ctx.from.username || null;
    const firstName = ctx.from.first_name || null;

    // Создаём или обновляем пользователя в БД (без всяких кодов!)
    await prisma.user.upsert({
        where: { telegramId: BigInt(tgId) },
        update: { username, firstName },
        create: { telegramId: BigInt(tgId), isVerified: true, username, firstName }
    });

    console.log(`[BOT] /start от ${firstName} (@${username}), ID: ${tgId}`);

    await ctx.reply(
        `👋 Привет, ${firstName || 'друг'}!\n\n🚀 Твой личный кабинет ShAG готов.\nНажми кнопку ниже, чтобы войти.`,
        Markup.inlineKeyboard([
            Markup.button.webApp('🚀 Открыть ShAG', process.env.WEBAPP_URL || 'https://admin-topaz-seven.vercel.app')
        ])
    );
});

// /idea <текст>
bot.command('idea', async (ctx) => {
    const text = ctx.message.text.replace('/idea', '').trim();
    if (!text) return ctx.reply('💡 Напиши идею после команды:\n/idea Хочу тёмную тему!');

    try {
        await prisma.idea.create({
            data: { telegramId: BigInt(ctx.from.id), username: ctx.from.username || null, content: text }
        });
        await ctx.reply('✅ Спасибо! Идея сохранена.');
    } catch (e) {
        ctx.reply('❌ Ошибка при сохранении.');
    }
});

// /admin admin123
bot.command('admin', async (ctx) => {
    const password = ctx.message.text.split(' ')[1];
    if (password !== 'admin123') return ctx.reply('⛔ Неверный пароль.');

    await ctx.reply('🔧 Админ-панель:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 Запросы', 'download_requests')],
            [Markup.button.callback('💡 Идеи', 'download_ideas')],
            [Markup.button.callback('👥 Юзеры', 'download_users')],
            [Markup.button.callback('📊 Статистика', 'view_stats')]
        ])
    );
});

// Админ: Выгрузка запросов
bot.action('download_requests', async (ctx) => {
    try {
        const requests = await prisma.request.findMany({ orderBy: { createdAt: 'desc' } });
        if (requests.length === 0) return ctx.reply('📂 Пусто.');
        const header = 'ID,TelegramID,Username,Type,Content,Date\n';
        const rows = requests.map(r => `${r.id},${r.telegramId},${r.username || ''},"${r.type}","${r.content.replace(/"/g, '""').replace(/\n/g, ' ')}",${r.createdAt.toISOString()}`).join('\n');
        await ctx.replyWithDocument({ source: Buffer.from(header + rows, 'utf-8'), filename: `requests_${new Date().toISOString().split('T')[0]}.csv` });
    } catch (e) { ctx.reply('❌ Ошибка.'); }
    await ctx.answerCbQuery();
});

// Админ: Выгрузка идей
bot.action('download_ideas', async (ctx) => {
    try {
        const ideas = await prisma.idea.findMany({ orderBy: { createdAt: 'desc' } });
        if (ideas.length === 0) return ctx.reply('📂 Пусто.');
        const header = 'ID,TelegramID,Username,Content,Date\n';
        const rows = ideas.map(r => `${r.id},${r.telegramId},${r.username || ''},"${r.content.replace(/"/g, '""').replace(/\n/g, ' ')}",${r.createdAt.toISOString()}`).join('\n');
        await ctx.replyWithDocument({ source: Buffer.from(header + rows, 'utf-8'), filename: `ideas_${new Date().toISOString().split('T')[0]}.csv` });
    } catch (e) { ctx.reply('❌ Ошибка.'); }
    await ctx.answerCbQuery();
});

// Админ: Выгрузка юзеров
bot.action('download_users', async (ctx) => {
    try {
        const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
        if (users.length === 0) return ctx.reply('📂 Пусто.');
        const header = 'ID,TelegramID,Username,FirstName,LastName,Occupation,Phone,Date\n';
        const rows = users.map(u => `${u.id},${u.telegramId},${u.username || ''},"${u.firstName || ''}","${u.lastName || ''}","${u.occupation || ''}","${u.phone || ''}",${u.createdAt.toISOString()}`).join('\n');
        await ctx.replyWithDocument({ source: Buffer.from(header + rows, 'utf-8'), filename: `users_${new Date().toISOString().split('T')[0]}.csv` });
    } catch (e) { ctx.reply('❌ Ошибка.'); }
    await ctx.answerCbQuery();
});

// Админ: Статистика
bot.action('view_stats', async (ctx) => {
    try {
        const [totalUsers, totalGoals, activeGoals, completedGoals, totalSteps] = await Promise.all([
            prisma.user.count(),
            prisma.goal.count(),
            prisma.goal.count({ where: { status: 'ACTIVE' } }),
            prisma.goal.count({ where: { status: 'COMPLETED' } }),
            prisma.step.count()
        ]);
        await ctx.replyWithMarkdown(`📊 *Статистика*\n\n👥 Юзеров: ${totalUsers}\n🎯 Целей: ${totalGoals}\n✅ Активных: ${activeGoals}\n🏆 Завершено: ${completedGoals}\n👣 Шагов: ${totalSteps}`);
    } catch (e) { ctx.reply('❌ Ошибка.'); }
    await ctx.answerCbQuery();
});

// Отчёты через текст
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    const val = parseFloat(ctx.message.text.replace(',', '.'));
    if (!isNaN(val)) {
        ctx.reply(`Принято: ${val}. (Логика метрик будет добавлена)`);
    }
});

// ======================================================
// 6. УВЕДОМЛЕНИЯ (НАПОМИНАНИЯ)
// ======================================================

// Проверка каждую минуту
cron.schedule('* * * * *', async () => {
    const now = new Date();
    // Форматируем текущее время в HH:mm (по серверу!)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    console.log(`[CRON] Проверка уведомлений для ${currentTime}...`);

    try {
        // Начало сегодняшнего дня (00:00:00) для проверки наличия шагов
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Ищем пользователей, у которых:
        // 1. Совпадает время уведомления
        // 2. Есть хотя бы одна активная цель
        const usersToNotify = await prisma.user.findMany({
            where: {
                notificationTime: currentTime,
                goals: { some: { status: 'ACTIVE' } }
            },
            include: {
                goals: {
                    where: { status: 'ACTIVE' },
                    include: {
                        steps: {
                            where: { createdAt: { gte: todayStart } }
                        }
                    }
                }
            }
        });

        for (const user of usersToNotify) {
            // Проверяем, есть ли шаги сегодня по любой из активных целей
            const hasAnyStepToday = user.goals.some(g => g.steps.length > 0);

            if (!hasAnyStepToday) {
                console.log(`[NOTIFY] Отправка уведомления пользователю ${user.telegramId} (${user.firstName})`);

                try {
                    await bot.telegram.sendMessage(
                        user.telegramId.toString(),
                        `🔔 *Время сделать ШАГ!*\n\nПривет, ${user.firstName || 'друг'}! Ты ещё не записал прогресс по своим целям сегодня. \n\nПомни: дисциплина — это мост между целями и достижениями. Ждём твой отчёт! 🚀`,
                        {
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([
                                Markup.button.webApp('🚀 Открыть ShAG', process.env.WEBAPP_URL || 'https://admin-topaz-seven.vercel.app')
                            ])
                        }
                    );
                } catch (sendError) {
                    console.error(`[NOTIFY-ERROR] Не удалось отправить сообщение ${user.telegramId}:`, sendError);
                }
            }
        }
    } catch (e) {
        console.error('[CRON-ERROR]:', e);
    }
});

// ======================================================
// 7. ЗАПУСК
// ======================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
bot.launch().then(() => console.log('✅ Bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
