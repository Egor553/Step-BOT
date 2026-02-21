import bcrypt from 'bcryptjs';

// Генерация 6-значного кода
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Хэширование пароля
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

// Проверка пароля
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

// Срок действия кода - 10 минут
export function getCodeExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
}
