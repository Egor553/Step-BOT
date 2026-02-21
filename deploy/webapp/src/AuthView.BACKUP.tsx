import { useState } from 'react';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';

const API_URL = 'https://aura-psi-two.vercel.app/api';

interface AuthViewProps {
    onLoginSuccess: (telegramId: string) => void;
}

export const AuthView = ({ onLoginSuccess }: AuthViewProps) => {
    const [mode, setMode] = useState<'choice' | 'register' | 'login' | 'verify' | 'forgot' | 'reset'>('choice');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        username: '',
        birthDate: '',
        login: '',
        password: '',
        confirmPassword: '',
        code: ''
    });

    const [telegramId, setTelegramId] = useState('');

    const handleRegister = async () => {
        if (!form.firstName || !form.lastName || !form.login || !form.password) {
            alert('Заполните все поля');
            return;
        }

        if (form.password !== form.confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        setLoading(true);
        try {
            const tgId = WebApp.initDataUnsafe.user?.id || '12345678';
            await axios.post(`${API_URL}/auth/register`, {
                telegramId: tgId,
                firstName: form.firstName,
                lastName: form.lastName,
                username: form.username,
                birthDate: form.birthDate,
                login: form.login,
                password: form.password
            });

            setTelegramId(tgId.toString());
            setMode('verify');
            alert('Код подтверждения отправлен в Telegram!');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!form.code) {
            alert('Введите код');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/auth/verify-code`, {
                telegramId,
                code: form.code
            });

            alert('Регистрация завершена!');
            onLoginSuccess(telegramId);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка проверки кода');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!form.login || !form.password) {
            alert('Введите логин и пароль');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                login: form.login,
                password: form.password
            });

            onLoginSuccess(res.data.user.telegramId);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!form.login) {
            alert('Введите логин');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/forgot-password`, {
                login: form.login
            });

            setTelegramId(res.data.telegramId);
            setMode('reset');
            alert('Код для сброса пароля отправлен в Telegram!');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка отправки кода');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!form.code || !form.password || !form.confirmPassword) {
            alert('Заполните все поля');
            return;
        }

        if (form.password !== form.confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/auth/reset-password`, {
                telegramId,
                code: form.code,
                newPassword: form.password
            });

            alert('Пароль изменен!');
            setMode('login');
            setForm({ ...form, password: '', confirmPassword: '', code: '' });
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка смены пароля');
        } finally {
            setLoading(false);
        }
    };

    // Экран выбора
    if (mode === 'choice') {
        return (
            <div style={{ padding: 24, maxWidth: 400, margin: '40px auto' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 28, marginBottom: 8 }}>Добро пожаловать в ШАГ</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Выберите действие</p>

                    <button
                        className="primary"
                        style={{ width: '100%', height: 56, fontSize: 16, marginBottom: 12 }}
                        onClick={() => setMode('register')}
                    >
                        Регистрация
                    </button>

                    <button
                        style={{
                            width: '100%',
                            height: 56,
                            fontSize: 16,
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: 16,
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                        onClick={() => setMode('login')}
                    >
                        Вход
                    </button>
                </div>
            </div>
        );
    }

    // Экран регистрации
    if (mode === 'register') {
        return (
            <div style={{ padding: 24, maxWidth: 400, margin: '40px auto' }}>
                <div className="card">
                    <h2 style={{ marginBottom: 24 }}>Регистрация</h2>

                    <input
                        type="text"
                        placeholder="Имя"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="text"
                        placeholder="Фамилия"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="text"
                        placeholder="Юзернейм"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="date"
                        placeholder="Дата рождения"
                        value={form.birthDate}
                        onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="text"
                        placeholder="Логин"
                        value={form.login}
                        onChange={(e) => setForm({ ...form, login: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="password"
                        placeholder="Пароль"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="password"
                        placeholder="Подтвердите пароль"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 24, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <button
                        className="primary"
                        style={{ width: '100%', height: 56, fontSize: 16, marginBottom: 12 }}
                        onClick={handleRegister}
                        disabled={loading}
                    >
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>

                    <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}
                        onClick={() => setMode('choice')}
                    >
                        Назад
                    </button>
                </div>
            </div>
        );
    }

    // Экран подтверждения кода
    if (mode === 'verify') {
        return (
            <div style={{ padding: 24, maxWidth: 400, margin: '40px auto' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 12 }}>Подтверждение</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Введите код из Telegram</p>

                    <input
                        type="text"
                        placeholder="Код из Telegram"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 24, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15, textAlign: 'center' }}
                    />

                    <button
                        className="primary"
                        style={{ width: '100%', height: 56, fontSize: 16 }}
                        onClick={handleVerifyCode}
                        disabled={loading}
                    >
                        {loading ? 'Проверка...' : 'Подтвердить'}
                    </button>
                </div>
            </div>
        );
    }

    // Экран входа
    if (mode === 'login') {
        return (
            <div style={{ padding: 24, maxWidth: 400, margin: '40px auto' }}>
                <div className="card">
                    <h2 style={{ marginBottom: 24 }}>Вход</h2>

                    <input
                        type="text"
                        placeholder="Логин"
                        value={form.login}
                        onChange={(e) => setForm({ ...form, login: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="password"
                        placeholder="Пароль"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 24, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <button
                        className="primary"
                        style={{ width: '100%', height: 56, fontSize: 16, marginBottom: 12 }}
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </button>

                    <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: 14, cursor: 'pointer', marginBottom: 12 }}
                        onClick={() => setMode('forgot')}
                    >
                        Забыли пароль?
                    </button>

                    <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}
                        onClick={() => setMode('choice')}
                    >
                        Назад
                    </button>
                </div>
            </div>
        );
    }

    // Экран восстановления пароля
    if (mode === 'forgot') {
        return (
            <div style={{ padding: 24, maxWidth: 400, margin: '40px auto' }}>
                <div className="card">
                    <h2 style={{ marginBottom: 12 }}>Восстановление пароля</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>Введите логин для отправки кода в Telegram</p>

                    <input
                        type="text"
                        placeholder="Логин"
                        value={form.login}
                        onChange={(e) => setForm({ ...form, login: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 24, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <button
                        className="primary"
                        style={{ width: '100%', height: 56, fontSize: 16, marginBottom: 12 }}
                        onClick={handleForgotPassword}
                        disabled={loading}
                    >
                        {loading ? 'Отправка...' : 'Отправить код'}
                    </button>

                    <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}
                        onClick={() => setMode('login')}
                    >
                        Назад к входу
                    </button>
                </div>
            </div>
        );
    }

    // Экран смены пароля
    if (mode === 'reset') {
        return (
            <div style={{ padding: 24, maxWidth: 400, margin: '40px auto' }}>
                <div className="card">
                    <h2 style={{ marginBottom: 24 }}>Новый пароль</h2>

                    <input
                        type="text"
                        placeholder="Код из Telegram"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="password"
                        placeholder="Новый пароль"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <input
                        type="password"
                        placeholder="Подтвердите пароль"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        style={{ width: '100%', padding: 12, marginBottom: 24, borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15 }}
                    />

                    <button
                        className="primary"
                        style={{ width: '100%', height: 56, fontSize: 16 }}
                        onClick={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? 'Сохранение...' : 'Сменить пароль'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
