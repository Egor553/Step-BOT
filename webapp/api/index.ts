import { PrismaClient } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS настройки для Mini App
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

    try {
        // 1. Получение данных юзера: /api/user/[tgId]
        if (req.method === 'GET' && pathname.includes('/user/')) {
            const parts = pathname.split('/');
            const tgIdString = parts[parts.length - 1];
            if (!tgIdString) return res.status(400).json({ error: 'No ID' });

            const tgId = BigInt(tgIdString);
            const user = await prisma.user.findUnique({
                where: { telegramId: tgId },
                include: {
                    goals: {
                        orderBy: { startDate: 'desc' },
                        include: { steps: { orderBy: { createdAt: 'asc' } } }
                    }
                }
            });

            if (!user) {
                const newUser = await prisma.user.create({
                    data: { telegramId: tgId }
                });
                return res.json(serialize(newUser));
            }

            return res.json(serialize(user));
        }

        // 2. Сохранение профиля: POST /api/user/profile
        if (req.method === 'POST' && (pathname.endsWith('/user/profile') || pathname.endsWith('/profile'))) {
            const { telegramId, firstName, lastName, occupation, phone } = req.body;
            await prisma.user.update({
                where: { telegramId: BigInt(telegramId) },
                data: { firstName, lastName, occupation, phone }
            });
            return res.json({ success: true });
        }

        // 3. Создание цели: POST /api/goals
        if (req.method === 'POST' && pathname.endsWith('/goals')) {
            const { telegramId, description, duration } = req.body;
            const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
            if (!user) return res.status(404).json({ error: 'User not found' });

            const deadline = new Date();
            if (Number(duration) === 0) {
                // Тестовый режим: 1 минута
                deadline.setMinutes(deadline.getMinutes() + 1);
            } else {
                deadline.setMonth(deadline.getMonth() + Number(duration));
            }

            const goal = await prisma.goal.create({
                data: {
                    userId: user.id,
                    description,
                    duration: Number(duration),
                    deadline
                }
            });
            return res.json(serialize(goal));
        }

        // 4. Добавление шага: POST /api/steps
        if (req.method === 'POST' && pathname === '/api/steps') {
            const { goalId, content, evaluation, isKey } = req.body;
            const step = await prisma.step.create({
                data: {
                    goalId: Number(goalId),
                    content,
                    evaluation,
                    isKey: Boolean(isKey)
                }
            });
            return res.json(serialize(step));
        }

        return res.status(404).json({ error: 'Not Found' });

    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}

// Помощник для превращения BigInt в строку (чтобы JSON не ломался)
function serialize(obj: any) {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}
