import { Telegraf, Markup } from 'telegraf';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import prisma from './db';
import cron from 'node-cron';
import * as fs from 'fs';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '');

// Команда /admin <password> для выгрузки запросов
// Команда /idea <текст> для предложений
bot.command('idea', async (ctx) => {
    const text = ctx.message.text.replace('/idea', '').trim();
    if (!text) {
        return ctx.reply('💡 Напишите вашу идею после команды, например:\n/idea Хочу темную тему и календарь!');
    }

    try {
        await prisma.idea.create({
            data: {
                telegramId: BigInt(ctx.from.id),
                username: ctx.from.username || null,
                content: text
            }
        });
        await ctx.reply('✅ Спасибо! Ваша идея сохранена. Лучшие предложения мы обязательно реализуем!');
    } catch (e) {
        console.error('Idea Error:', e);
        ctx.reply('❌ Ошибка при сохранении идеи.');
    }
});

// Команда /admin <password> для меню
bot.command('admin', async (ctx) => {
    const text = ctx.message.text || '';
    const args = text.split(' ');
    const password = args[1];

    if (password !== 'admin123') {
        return ctx.reply('⛔ Доступ запрещен. Неверный пароль.');
    }

    await ctx.reply('🔧 Админ-панель. Выберите действие:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 Выгрузить Запросы', 'download_requests')],
            [Markup.button.callback('💡 Выгрузить Идеи', 'download_ideas')]
        ])
    );
});

// Обработчик кнопки "Выгрузить Запросы"
bot.action('download_requests', async (ctx) => {
    try {
        const requests = await prisma.request.findMany({
            orderBy: { createdAt: 'desc' }
        });

        if (requests.length === 0) {
            return ctx.reply('📂 База запросов пуста.');
        }

        const header = 'ID,TelegramID,Username,Type,Content,Date\n';
        const rows = requests.map(r => {
            const content = r.content.replace(/"/g, '""').replace(/\n/g, ' ');
            return `${r.id},${r.telegramId},${r.username || ''},"${r.type}","${content}",${r.createdAt.toISOString()}`;
        }).join('\n');

        const buffer = Buffer.from(header + rows, 'utf-8');

        await ctx.replyWithDocument({
            source: buffer,
            filename: `requests_${new Date().toISOString().split('T')[0]}.csv`
        }, { caption: `✅ Выгрузка запросов (${requests.length} шт.)` });

    } catch (e) {
        console.error('Admin Error:', e);
        ctx.reply('❌ Ошибка при выгрузке.');
    }
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Выгрузить Идеи"
bot.action('download_ideas', async (ctx) => {
    try {
        const ideas = await prisma.idea.findMany({
            orderBy: { createdAt: 'desc' }
        });

        if (ideas.length === 0) {
            return ctx.reply('📂 База идей пуста.');
        }

        const header = 'ID,TelegramID,Username,Content,Date\n';
        const rows = ideas.map(r => {
            const content = r.content.replace(/"/g, '""').replace(/\n/g, ' ');
            return `${r.id},${r.telegramId},${r.username || ''},"${content}",${r.createdAt.toISOString()}`;
        }).join('\n');

        const buffer = Buffer.from(header + rows, 'utf-8');

        await ctx.replyWithDocument({
            source: buffer,
            filename: `ideas_${new Date().toISOString().split('T')[0]}.csv`
        }, { caption: `💡 Выгрузка идей (${ideas.length} шт.)` });

    } catch (e) {
        console.error('Admin Error:', e);
        ctx.reply('❌ Ошибка при выгрузке.');
    }
    await ctx.answerCbQuery();
});

const app = express();

// CORS настройки для работы с frontend
app.use(cors({
    origin: [
        'https://admin-topaz-seven.vercel.app',
        'https://admin-r1n4bzxc7-egors-projects-333b7681.vercel.app',
        'https://aura-psi-two.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- API для Mini App ---

// Получение профиля и активной цели (создает пользователя, если его нет)
app.get('/api/user/:tgId', async (req: Request, res: Response) => {
    const tgId = BigInt(req.params.tgId as string);
    try {
        let user = await prisma.user.findUnique({
            where: { telegramId: tgId },
            include: {
                goals: {
                    orderBy: { startDate: 'desc' },
                    include: { steps: { orderBy: { createdAt: 'desc' } } }
                }
            }
        });

        if (!user) {
            // Создаем пользователя автоматически, если не найден
            user = await prisma.user.create({
                data: {
                    telegramId: tgId,
                    isVerified: true // Считаем верифицированным сразу, так как он зашел через Telegram
                },
                include: {
                    goals: {
                        orderBy: { startDate: 'desc' },
                        include: { steps: { orderBy: { createdAt: 'desc' } } }
                    }
                }
            });
        }

        const data = JSON.parse(JSON.stringify(user, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        res.json(data);
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ error: 'Ошибка БД' });
    }
});

// Сохранение профиля
app.post('/api/user/profile', async (req: Request, res: Response) => {
    const { telegramId, firstName, lastName, occupation, phone, notificationTime } = req.body;
    try {
        await prisma.user.update({
            where: { telegramId: BigInt(telegramId) },
            data: { firstName, lastName, occupation, phone, notificationTime }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка при сохранении' });
    }
});

// Обработка запросов и вакансий
app.post('/api/requests', async (req: Request, res: Response) => {
    const { telegramId, type, content, username } = req.body;
    try {
        const logEntry = `[${new Date().toISOString()}] [${type}] @${username || 'anon'} (ID: ${telegramId}): ${content}\n---\n`;

        // Сохраняем в БД (надежно)
        await prisma.request.create({
            data: {
                telegramId: BigInt(telegramId),
                username: username || null,
                type,
                content
            }
        });

        // Лог в файл (опционально)
        fs.appendFile('requests.txt', logEntry, (err) => {
            if (err) console.error('Error writing to requests.txt', err);
        });

        // Уведомляем админа
        const adminId = process.env.ADMIN_ID;
        if (adminId && adminId !== 'ВАШ_ID_ЗДЕСЬ') {
            try {
                await bot.telegram.sendMessage(adminId, `📩 *Новый запрос / Вакансия*\n\n📌 *Тип:* ${type}\n👤 *От:* @${username ? username.replace(/_/g, '\\_') : 'anon'} (ID: \`${telegramId}\`)\n\n📝 *Сообщение:*\n${content}`, { parse_mode: 'Markdown' });
            } catch (e) {
                console.error('Failed to send admin notification', e);
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка обработки запроса' });
    }
});

// Сохранение идей из Mini App
app.post('/api/ideas', async (req: Request, res: Response) => {
    const { telegramId, content, username } = req.body;
    try {
        await prisma.idea.create({
            data: {
                telegramId: BigInt(telegramId),
                username: username || null,
                content
            }
        });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сохранения идеи' });
    }
});

// Создание новой цели
app.post('/api/goals', async (req: Request, res: Response) => {
    const { telegramId, description, duration, customDeadline, category } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId) },
            include: { goals: { where: { status: 'ACTIVE' } } }
        });
        if (!user) return res.status(404).json({ error: 'Сначала синхронизируйте профиль в боте!' });

        if (user.goals.length >= 3) {
            return res.status(400).json({ error: 'Максимум 3 активные цели! Завершите текущие, чтобы поставить новую.' });
        }

        let deadline: Date;
        if (customDeadline) {
            deadline = new Date(customDeadline);
        } else if (Number(duration) === 0) {
            // Тестовый режим: 1 минута
            deadline = new Date();
            deadline.setMinutes(deadline.getMinutes() + 1);
        } else {
            deadline = new Date();
            deadline.setMonth(deadline.getMonth() + Number(duration));
        }

        const goal = await prisma.goal.create({
            data: {
                userId: user.id,
                description,
                category: category || 'PERSONAL',
                duration: Number(duration),
                deadline,
                status: 'ACTIVE',
                metric: req.body.metric || null
            }
        });
        res.json(goal);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка создания цели' });
    }
});

// Добавление шага из Mini App
app.post('/api/steps', async (req: Request, res: Response) => {
    const { goalId, content, evaluation, isKey } = req.body;
    try {
        const step = await prisma.step.create({
            data: {
                goalId: Number(goalId),
                content,
                evaluation,
                value: req.body.value ? parseFloat(req.body.value) : null,
                isKey: Boolean(isKey)
            }
        });
        res.json(step);
    } catch (e) {
        res.status(500).json({ error: 'Ошибка сохранения шага' });
    }
});

// Обновление шага
app.put('/api/steps/:id', async (req: Request, res: Response) => {
    const { content, evaluation, value, isKey } = req.body;
    try {
        const step = await prisma.step.update({
            where: { id: Number(req.params.id) },
            data: {
                content,
                evaluation,
                value: value !== undefined ? parseFloat(value) : undefined,
                isKey: isKey !== undefined ? Boolean(isKey) : undefined
            }
        });
        res.json(step);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка обновления шага' });
    }
});

// Удаление шага
app.delete('/api/steps/:id', async (req: Request, res: Response) => {
    try {
        await prisma.step.delete({
            where: { id: Number(req.params.id) }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка удаления шага' });
    }
});

// Удаление цели
app.delete('/api/goals/:id', async (req: Request, res: Response) => {
    try {
        const goalId = Number(req.params.id);
        // Сначала удаляем все шаги цели, чтобы не нарушать целостность БД
        await prisma.step.deleteMany({ where: { goalId } });
        await prisma.goal.delete({ where: { id: goalId } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка удаления цели' });
    }
});

// Обновление цели (например, название)
app.put('/api/goals/:id', async (req: Request, res: Response) => {
    const { description } = req.body;
    try {
        const goal = await prisma.goal.update({
            where: { id: Number(req.params.id) },
            data: { description }
        });
        res.json(goal);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка обновления цели' });
    }
});

// --- Auth API ---

import { generateVerificationCode, hashPassword, verifyPassword, getCodeExpiry } from './auth';

// Регистрация - шаг 1: создание пользователя и отправка кода
app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { telegramId, firstName, lastName, username, birthDate, login, password } = req.body;

    try {
        // Проверка что логин уникален
        const existing = await prisma.user.findUnique({ where: { login } });
        if (existing) {
            return res.status(400).json({ error: 'Логин уже занят' });
        }

        const hashedPassword = await hashPassword(password);
        const code = generateVerificationCode();
        const codeExpiry = getCodeExpiry();

        // Проверка валидности даты рождения
        const parsedBirthDate = birthDate ? new Date(birthDate) : null;
        const isValidDate = parsedBirthDate && !isNaN(parsedBirthDate.getTime());

        const user = await prisma.user.upsert({
            where: { telegramId: BigInt(telegramId) },
            update: {
                firstName,
                lastName,
                username,
                birthDate: isValidDate ? parsedBirthDate : null,
                login,
                password: hashedPassword,
                verificationCode: code,
                codeExpiry,
                isVerified: false
            },
            create: {
                telegramId: BigInt(telegramId),
                firstName,
                lastName,
                username,
                birthDate: isValidDate ? parsedBirthDate : null,
                login,
                password: hashedPassword,
                verificationCode: code,
                codeExpiry,
                isVerified: false
            }
        });

        // Отправка кода в Telegram
        try {
            await bot.telegram.sendMessage(telegramId, `✅ Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`);
            res.json({ success: true, message: 'Код отправлен в Telegram' });
        } catch (telegramError) {
            // Если Telegram недоступен (локальная разработка) - возвращаем код в ответе
            console.log('Telegram недоступен, возвращаю код в ответе:', code);
            res.json({ success: true, message: 'Код отправлен', code }); // Для тестирования
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Регистрация - шаг 2: проверка кода
app.post('/api/auth/verify-code', async (req: Request, res: Response) => {
    const { telegramId, code } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });

        if (!user || !user.verificationCode || !user.codeExpiry) {
            return res.status(400).json({ error: 'Код не найден' });
        }

        if (new Date() > user.codeExpiry) {
            return res.status(400).json({ error: 'Код истек. Запросите новый.' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Неверный код' });
        }

        // Подтверждение аккаунта
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                codeExpiry: null
            }
        });

        res.json({ success: true, message: 'Аккаунт подтвержден!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка проверки кода' });
    }
});

// Вход
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { login, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { login } });

        if (!user || !user.password) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ error: 'Аккаунт не подтвержден' });
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                telegramId: user.telegramId.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                login: user.login
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Восстановление пароля - шаг 1: отправка кода
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    const { login } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { login } });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const code = generateVerificationCode();
        const codeExpiry = getCodeExpiry();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: code,
                codeExpiry
            }
        });

        // Отправка кода в Telegram
        await bot.telegram.sendMessage(user.telegramId.toString(), `🔐 Код для сброса пароля: ${code}\n\nКод действителен 10 минут.`);

        res.json({ success: true, message: 'Код отправлен в Telegram', telegramId: user.telegramId.toString() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка отправки кода' });
    }
});

// Восстановление пароля - шаг 2: смена пароля
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    const { telegramId, code, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });

        if (!user || !user.verificationCode || !user.codeExpiry) {
            return res.status(400).json({ error: 'Код не найден' });
        }

        if (new Date() > user.codeExpiry) {
            return res.status(400).json({ error: 'Код истек. Запросите новый.' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Неверный код' });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                verificationCode: null,
                codeExpiry: null
            }
        });

        res.json({ success: true, message: 'Пароль изменен!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    }
});

// Синхронизация по коду из Telegram
app.post('/api/auth/sync-code', async (req: Request, res: Response) => {
    const { code } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: {
                verificationCode: code,
                codeExpiry: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Неверный или просроченный код' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                codeExpiry: null
            }
        });

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка синхронизации' });
    }
});

// --- Telegram Bot Logic ---

bot.start(async (ctx) => {
    const tgId = ctx.from.id;
    const username = ctx.from.username || '';
    const firstName = ctx.from.first_name || '';

    // Генерация случайного 6-значного кода
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15); // Код действителен 15 минут

    try {
        await prisma.user.upsert({
            where: { telegramId: BigInt(tgId) },
            update: {
                verificationCode: code,
                codeExpiry: expiry,
                username,
                firstName
            },
            create: {
                telegramId: BigInt(tgId),
                username,
                firstName,
                verificationCode: code,
                codeExpiry: expiry,
                isVerified: false
            }
        });

        await ctx.reply(`👋 Привет, ${firstName}!\n\n🔑 Твой код для входа: <code>${code}</code>\n(введи его в Профиле приложения)\n\n🤖 <b>Что я умею:</b>\n1. 🎯 <b>Вести к целям</b> — жми кнопку ниже.\n2. 📊 <b>Принимать отчеты</b> — просто напиши мне число (например, <b>5000</b> или <b>5.5</b>), и я занесу это в прогресс!\n3. 💡 <b>Собирать идеи</b> — пиши /idea твой_текст.\n\nПопробуй отправить мне цифру, если у тебя уже есть цель с метрикой!`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.webApp('🚀 Открыть ShAG', process.env.WEBAPP_URL || 'https://admin-topaz-seven.vercel.app')
                ])
            }
        );
    } catch (e) {
        console.error('Ошибка при старте:', e);
        ctx.reply('Произошла ошибка при регистрации. Попробуйте еще раз.');
    }
});

// Команда /help
bot.help((ctx: any) => {
    ctx.reply(
        '🆘 <b>Справка ShAG Bot:</b>\n\n' +
        '1. <b>Внести прогресс:</b> Напиши мне число (например: <code>10</code>, <code>5000</code>, <code>0.5</code>). Я добавлю это к твоей цели.\n' +
        '2. <b>Предложить идею:</b> Напиши <code>/idea Текст</code>.\n' +
        '3. <b>Настройки:</b> Открой Mini App (кнопка внизу).\n\n' +
        'Если бот не отвечает — напиши /start.',
        { parse_mode: 'HTML' }
    );
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;

    const telegramId = BigInt(ctx.from.id);
    const text = ctx.message.text.trim();

    // 1. Проверка на ввод МЕТРИКИ (число)
    // Пытаемся найти число в начале сообщения (например "5000", "5000 прибыль", "5.5 кг")
    const numberMatch = text.match(/^([\d]+([.,][\d]+)?)/);

    if (numberMatch) {
        const value = parseFloat(numberMatch[1].replace(',', '.'));
        // Проверяем, есть ли у пользователя цели с метриками
        const userWithMetrics = await prisma.user.findUnique({
            where: { telegramId },
            include: { goals: { where: { status: 'ACTIVE', metric: { not: null } } } }
        });

        if (userWithMetrics && userWithMetrics.goals.length > 0) {
            // Если есть одна цель - сохраняем сразу (для скорости)
            if (userWithMetrics.goals.length === 1) {
                const goal = userWithMetrics.goals[0];
                const content = text.replace(numberMatch[0], '').trim() || `Внесено значение: ${value}`;

                await prisma.step.create({
                    data: {
                        goalId: goal.id,
                        content: content,
                        evaluation: 'GREEN', // По умолчанию считаем это прогрессом
                        value: value,
                        isKey: false
                    }
                });
                return ctx.reply(`✅ Принято! \n🎯 ${goal.description}\n📊 ${goal.metric}: ${value}\n\nГрафик обновлен.`);
            }

            // Если целей несколько - спрашиваем
            const buttons = userWithMetrics.goals.map(g => [Markup.button.callback(`${g.description} (${g.metric})`, `add_metric_${g.id}_${value}`)]);
            return ctx.reply(`К какой цели отнести значение ${value}?`, Markup.inlineKeyboard(buttons));
        }
    }

    // 2. Логика создания НОВОЙ ЦЕЛИ (если это не число)
    const user = await prisma.user.findUnique({
        where: { telegramId },
        include: { goals: { where: { status: 'ACTIVE' } } }
    });

    if (user && user.goals.length < 3) {
        await ctx.reply(`Отличная цель! К какой сфере она относится?`, Markup.inlineKeyboard([
            [Markup.button.callback('👤 Личная', `choose_cat_PERSONAL_${encodeURIComponent(text.substring(0, 50))}`)],
            [Markup.button.callback('💼 Деловая', `choose_cat_BUSINESS_${encodeURIComponent(text.substring(0, 50))}`)]
        ]));
    } else if (user && user.goals.length >= 3) {
        await ctx.reply('У тебя уже 3 активные цели. Заверши одну из них в приложении, чтобы поставить новую!',
            Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть Трекер', process.env.WEBAPP_URL || 'https://admin-topaz-seven.vercel.app')]])
        );
    }
});

// Обработка выбора цели для метрики (когда их несколько)
bot.action(/add_metric_(\d+)_([\d.]+)/, async (ctx) => {
    const goalId = parseInt(ctx.match[1]);
    const value = parseFloat(ctx.match[2]);

    try {
        const goal = await prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal) return ctx.reply('❌ Цель не найдена.');

        await prisma.step.create({
            data: {
                goalId,
                content: `Внесено значение: ${value}`,
                evaluation: 'GREEN',
                value,
                isKey: false
            }
        });

        await ctx.editMessageText(`✅ Принято! \n🎯 ${goal.description}\n📊 ${goal.metric}: ${value}\n\nГрафик обновлен.`);
    } catch (e) {
        await ctx.editMessageText('❌ Ошибка при сохранении.');
    }
    await ctx.answerCbQuery();
});

// Обработка выбора категории
bot.action(/choose_cat_(PERSONAL|BUSINESS)_(.+)/, async (ctx) => {
    const cat = ctx.match[1];
    const desc = ctx.match[2];

    await ctx.editMessageText(`На какой период планируешь её поставить?`, Markup.inlineKeyboard([
        [Markup.button.callback('3 месяца', `set_goal_3_${cat}_${desc}`), Markup.button.callback('6 месяцев', `set_goal_6_${cat}_${desc}`)],
        [Markup.button.callback('9 месяцев', `set_goal_9_${cat}_${desc}`), Markup.button.callback('12 месяцев', `set_goal_12_${cat}_${desc}`)],
        [Markup.button.callback('📅 Выбрать дату и время', `custom_setup_${cat}_${desc}`)]
    ]));
    await ctx.answerCbQuery();
});

// Настройка кастомной даты - Шаг 1: Создание черновика и выбор года
bot.action(/custom_setup_(PERSONAL|BUSINESS)_(.+)/, async (ctx) => {
    const cat = ctx.match[1];
    const desc = decodeURIComponent(ctx.match[2]);
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } });

    if (!user) return ctx.reply('Ошибка: пользователь не найден');

    // Создаем цель-черновик
    const goal = await prisma.goal.create({
        data: {
            userId: user.id,
            description: desc,
            category: cat,
            duration: 0,
            status: 'DRAFT',
            deadline: new Date()
        }
    });

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];
    const buttons = years.map(y => Markup.button.callback(y.toString(), `set_year_${goal.id}_${y}`));

    await ctx.editMessageText('📅 Выберите год окончания цели:', Markup.inlineKeyboard([buttons]));
    await ctx.answerCbQuery();
});

// Шаг 2: Выбор месяца
bot.action(/set_year_(\d+)_(\d+)/, async (ctx) => {
    const goalId = ctx.match[1];
    const year = ctx.match[2];

    const months = [
        ['Янв', 'Фев', 'Мар'], ['Апр', 'Май', 'Июн'],
        ['Июл', 'Авг', 'Сен'], ['Окт', 'Ноя', 'Дек']
    ];

    const buttons = months.map((row, rIdx) => row.map((m, cIdx) => {
        const monthIndex = rIdx * 3 + cIdx;
        return Markup.button.callback(m, `set_month_${goalId}_${year}_${monthIndex}`);
    }));

    await ctx.editMessageText(`📅 Год: ${year}\nВыберите месяц:`, Markup.inlineKeyboard(buttons));
    await ctx.answerCbQuery();
});

// Шаг 3: Выбор дня
bot.action(/set_month_(\d+)_(\d+)_(\d+)/, async (ctx) => {
    const [_, goalId, year, month] = ctx.match;

    // Генерируем дни 1-31 (упрощенно, без проверки дней в месяце для UI)
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const buttons = [];
    let row: any[] = [];

    for (const d of days) {
        row.push(Markup.button.callback(d.toString(), `set_day_${goalId}_${year}_${month}_${d}`));
        if (row.length === 7) {
            buttons.push(row);
            row = [];
        }
    }
    if (row.length > 0) buttons.push(row);

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    await ctx.editMessageText(`📅 ${monthNames[Number(month)]} ${year}\nВыберите день:`, Markup.inlineKeyboard(buttons));
    await ctx.answerCbQuery();
});

// Шаг 4: Выбор времени
bot.action(/set_day_(\d+)_(\d+)_(\d+)_(\d+)/, async (ctx) => {
    const [_, goalId, year, month, day] = ctx.match;

    // Часы 00-23
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const buttons = [];
    let row: any[] = [];

    for (const h of hours) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        row.push(Markup.button.callback(timeStr, `set_time_${goalId}_${year}_${month}_${day}_${h}`));
        if (row.length === 4) {
            buttons.push(row);
            row = [];
        }
    }
    if (row.length > 0) buttons.push(row);

    await ctx.editMessageText(`📅 Дата: ${day}.${Number(month) + 1}.${year}\n⏰ Выберите время дедлайна:`, Markup.inlineKeyboard(buttons));
    await ctx.answerCbQuery();
});

// Финиш: Сохранение цели
bot.action(/set_time_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)/, async (ctx) => {
    const [_, goalIdStr, y, m, d, h] = ctx.match;
    const goalId = parseInt(goalIdStr);
    const date = new Date(parseInt(y), parseInt(m), parseInt(d), parseInt(h), 0, 0);

    try {
        const goal = await prisma.goal.update({
            where: { id: goalId },
            data: {
                status: 'ACTIVE',
                deadline: date,
                duration: 0
            }
        });

        const formattedDate = date.toLocaleString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        await ctx.editMessageText(`✅ [${goal.category === 'BUSINESS' ? '💼 Деловая' : '👤 Личная'}] Цель установлена до ${formattedDate}:\n"${goal.description}"\n\nТеперь каждый день делай ШАГ и отмечай его в приложении!`);
    } catch (e) {
        await ctx.editMessageText('❌ Ошибка при сохранении цели. Попробуйте снова.');
    }
});

// Обработка кнопок выбора срока (стандартный вариант)
bot.action(/set_goal_(\d+)_(PERSONAL|BUSINESS)_(.+)/, async (ctx) => {
    const months = parseInt(ctx.match[1]);
    const cat = ctx.match[2];
    const desc = decodeURIComponent(ctx.match[3]);

    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } });
    if (user) {
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + months);

        await prisma.goal.create({
            data: {
                userId: user.id,
                description: desc,
                category: cat,
                duration: months,
                deadline: deadline
            }
        });
        await ctx.answerCbQuery('Цель зафиксирована!');
        await ctx.editMessageText(`✅ [${cat === 'BUSINESS' ? '💼 Деловая' : '👤 Личная'}] Цель установлена до ${deadline.toLocaleDateString('ru-RU')}:\n"${desc}"\n\nТеперь каждый день делай ШАГ и отмечай его в приложении!`);
    }
});

// Напоминания о шагах
cron.schedule('0 20 * * *', async () => {
    const activeGoals = await prisma.goal.findMany({
        where: { status: 'ACTIVE' },
        include: { user: true }
    });

    for (const goal of activeGoals) {
        try {
            await bot.telegram.sendMessage(
                goal.user.telegramId.toString(),
                `Вечер добрый! Какой сегодня твой главный ШАГ к цели: "${goal.description}"?\n\nОткрой приложение и отметь свой прогресс!`,
                Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть приложение', process.env.WEBAPP_URL || 'http://localhost:5173')]])
            );
        } catch (e) { console.error(e); }
    }
});

// --- Эндпоинт глобальной статистики платформы ---
app.get('/api/stats', async (req: Request, res: Response) => {
    try {
        const [
            totalUsers,
            usersWithGoals,
            totalGoals,
            activeGoals,
            completedGoals,
            totalSteps,
            goalsWithSteps
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { goals: { some: {} } } }),
            prisma.goal.count(),
            prisma.goal.count({ where: { status: 'ACTIVE' } }),
            prisma.goal.count({ where: { status: 'COMPLETED' } }),
            prisma.step.count(),
            prisma.goal.findMany({
                include: { _count: { select: { steps: true } }, user: true },
                orderBy: { steps: { _count: 'desc' } },
                take: 1
            })
        ]);

        const recordGoal = goalsWithSteps[0] || null;

        res.json({
            totalUsers,
            usersWithGoals,
            usersWithoutGoals: totalUsers - usersWithGoals,
            totalGoals,
            activeGoals,
            completedGoals,
            totalSteps,
            recordGoal: recordGoal ? {
                description: recordGoal.description,
                stepsCount: recordGoal._count.steps,
                username: recordGoal.user?.username || null,
                firstName: recordGoal.user?.firstName || null
            } : null
        });
    } catch (e) {
        console.error('Stats error:', e);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Эндпоинт для Vercel Cron (внешний вызов проверки дедлайнов)
app.get('/api/cron/check-goals', async (req: Request, res: Response) => {
    try {
        const expiredGoals = await prisma.goal.findMany({
            where: {
                status: 'ACTIVE',
                deadline: { lt: new Date() }
            },
            include: { user: true }
        });

        for (const goal of expiredGoals) {
            await prisma.goal.update({
                where: { id: goal.id },
                data: { status: 'COMPLETED' }
            });

            await bot.telegram.sendMessage(
                goal.user.telegramId.toString(),
                `🏁 Цель "${goal.description}" подошла к концу. Выполнили ли вы её?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Да, выполнил', `goal_done_YES_${goal.id}`)],
                    [Markup.button.callback('❌ Нет, не выполнил', `goal_done_NO_${goal.id}`)]
                ])
            );
        }
        res.json({ success: true, processed: expiredGoals.length });
    } catch (e) {
        console.error('Error in cron endpoint:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Проверка завершенных целей (дедлайнов) - для локальной работы
cron.schedule('* * * * *', async () => {
    // Вызываем ту же логику, что и выше
    const expiredGoals = await prisma.goal.findMany({
        where: {
            status: 'ACTIVE',
            deadline: { lt: new Date() }
        },
        include: { user: true }
    });

    for (const goal of expiredGoals) {
        try {
            await prisma.goal.update({
                where: { id: goal.id },
                data: { status: 'COMPLETED' }
            });

            await bot.telegram.sendMessage(
                goal.user.telegramId.toString(),
                `🏁 Цель "${goal.description}" подошла к концу. Выполнили ли вы её?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Да, выполнил', `goal_done_YES_${goal.id}`)],
                    [Markup.button.callback('❌ Нет, не выполнил', `goal_done_NO_${goal.id}`)]
                ])
            );
        } catch (e) { console.error('Error in deadline cron:', e); }
    }
});

// Обработка ответов на завершение цели
bot.action(/goal_done_(YES|NO)_(.+)/, async (ctx) => {
    const isDone = ctx.match[1] === 'YES';
    const goalId = parseInt(ctx.match[2]);

    if (isDone) {
        await ctx.editMessageText('🔥 Красава! Это отличный результат. Что дальше?', Markup.inlineKeyboard([
            [Markup.button.callback('🎯 Создать новую цель', 'goal_ACTION_NEW')],
            [Markup.button.webApp('🗺️ Изучить весь путь', process.env.WEBAPP_URL || 'https://admin-topaz-seven.vercel.app')]
        ]));
    } else {
        await ctx.editMessageText('Ничего страшного, любой опыт в копилку! Что выберешь сейчас?', Markup.inlineKeyboard([
            [Markup.button.callback('🎯 Создать новую цель', 'goal_ACTION_NEW')],
            [Markup.button.callback('⏳ Продолжить текущую', `goal_ACTION_RESUME_${goalId}`)],
            [Markup.button.webApp('🗺️ Изучить весь путь', process.env.WEBAPP_URL || 'https://admin-topaz-seven.vercel.app')]
        ]));
    }
    await ctx.answerCbQuery();
});

bot.action('goal_ACTION_NEW', async (ctx) => {
    await ctx.editMessageText('Напиши здесь свою новую цель, и я помогу её зафиксировать! 🚀');
    await ctx.answerCbQuery();
});

bot.action(/goal_ACTION_RESUME_(.+)/, async (ctx) => {
    const goalId = parseInt(ctx.match[1]);
    try {
        const goal = await prisma.goal.findUnique({ where: { id: goalId } });
        if (goal) {
            // Продлеваем на 1 месяц по умолчанию или просто делаем активной
            const newDeadline = new Date();
            newDeadline.setMonth(newDeadline.getMonth() + 1);

            await prisma.goal.update({
                where: { id: goalId },
                data: { status: 'ACTIVE', deadline: newDeadline }
            });
            await ctx.editMessageText(`✅ Цель "${goal.description}" снова активна! Новый дедлайн: ${newDeadline.toLocaleDateString('ru-RU')}. Вперёд к победе!`);
        }
    } catch (e) {
        await ctx.answerCbQuery('Ошибка при продлении цели');
    }
    await ctx.answerCbQuery();
});

// Обработка вебхука Telegram
app.post('/api/bot', async (req: Request, res: Response) => {
    try {
        await bot.handleUpdate(req.body, res);
    } catch (err) {
        console.error('Webhook Error:', err);
        res.status(500).send('Error');
    }
});

// --- CRON: Ежедневные напоминания ---
cron.schedule('* * * * *', async () => {
    const now = new Date();
    // UTC+3 (Moscow)
    const mskHour = (now.getUTCHours() + 3) % 24;
    const mskMinute = now.getUTCMinutes();
    const timeString = `${mskHour.toString().padStart(2, '0')}:${mskMinute.toString().padStart(2, '0')}`;

    console.log(`[CRON] Checking notifications at ${timeString} MSK`);

    try {
        const users = await prisma.user.findMany({
            where: {
                // Ищем тех, у кого время совпадает И есть активные цели
                notificationTime: timeString,
                goals: { some: { status: 'ACTIVE' } }
            },
            include: {
                goals: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' }, take: 1 }
            }
        });

        for (const user of users) {
            const goal = user.goals[0];

            // Варианты "мягких" напоминаний (чтобы не давить на чувство вины)
            const messages = [
                `👋 Привет, ${user.firstName || 'друг'}! Как настрой сегодня? 🌟\n\nТвоя цель "${goal.description}" ждет, но без давления. Если есть шаг — супер, отметь его. Если нет — просто вспомни, ради чего ты это начал. Мы играем в долгую! 🧘‍♂️`,
                `🚀 Салют! Маленький шаг лучше, чем ничего.\n\nКак там "${goal.description}"? Если есть новости — заглядывай в трекер. Все идет по плану!`,
                `👀 Минутка осознанности, ${user.firstName || 'чемпион'}.\n\nПомнишь про цель "${goal.description}"?\nГлавное не скорость, а постоянство. Залетай отметить прогресс, если он есть!`
            ];

            const msg = messages[Math.floor(Math.random() * messages.length)];

            try {
                // Пробуем отправить (если бот не заблокирован)
                await bot.telegram.sendMessage(user.telegramId.toString(), msg, {
                    // parse_mode: 'Markdown', // Убрал Markdown, чтобы спецсимволы в целях не ломали разметку
                    reply_markup: {
                        inline_keyboard: [[Markup.button.webApp("📲 Открыть ШАГ", process.env.WEBAPP_URL || '')]]
                    }
                });
                console.log(`[NOTIFY] Sent message to ${user.telegramId}`);
            } catch (e) {
                console.error(`[NOTIFY] Failed to send to ${user.telegramId}`, e);
            }
        }
    } catch (e) {
        console.error('[CRON] Error:', e);
    }
});

// Запуск сервера для локальной разработки
const PORT = process.env.PORT || 3000;

if ((process.env.NODE_ENV !== 'production' && !process.env.VERCEL) || process.env.USE_POLLING === 'true') {
    app.listen(PORT, () => {
        console.log(`🚀 API Server running on http://localhost:${PORT}`);
    });

    // Удаляем вебхук перед запуском лонг-поллинга локально
    bot.telegram.deleteWebhook({ drop_pending_updates: true })
        .then(() => {
            bot.launch();
            console.log('✅ Бот запущен локально (POLLING)');
        })
        .catch(err => console.error('❌ Ошибка очистки вебхука:', err));
}

// Экспорт для Vercel
export default app;
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
