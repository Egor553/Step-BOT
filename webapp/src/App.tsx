import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Map, CheckCircle2, Briefcase, Phone, Plus, Star, ChevronLeft, Target, Gamepad2, Users, Trophy, Snowflake, Zap, Trash2, Edit2, MessageSquare, HandHelping, Lightbulb, Clock, LogOut, Gift, Mail } from 'lucide-react';
import axios from 'axios';
import AnalyticsView from './components/AnalyticsView';
// import { AuthView } from './AuthView'; // BACKUP - авторизация отключена

const API_URL = '/api';

/**
 * Безопасная обертка для алертов (с фоллбеком на браузерный alert)
 */
const safeAlert = (message: string) => {
    try {
        WebApp.showAlert(message);
    } catch (e) {
        alert(message);
    }
};

/**
 * Безопасная обертка для confirm (с фоллбеком на браузерный confirm)
 */
const safeConfirm = (message: string, callback: (ok: boolean) => void) => {
    try {
        WebApp.showConfirm(message, callback);
    } catch (e) {
        const ok = window.confirm(message);
        callback(ok);
    }
};

/**
 * Безопасный вызов тактильной отдачи
 */
const safeHaptic = (type: 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' = 'light') => {
    try {
        if (['success', 'warning', 'error'].includes(type)) {
            WebApp.HapticFeedback?.notificationOccurred(type as any);
        } else {
            WebApp.HapticFeedback?.impactOccurred(type as any);
        }
    } catch (e) {
        // Игнорируем в браузере
    }
};

type Step = { id: number; content: string; evaluation: string; isKey: boolean; createdAt: string };
type Goal = { id: number; description: string; steps: Step[]; deadline: string; duration: number; status: string; startDate: string };

const BrandLogo = ({ size = 24, color = "currentColor" }: { size?: number, color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="78" width="80" height="12" fill={color} />
        <rect x="10" y="50" width="20" height="22" fill={color} />
        <rect x="40" y="36" width="20" height="36" fill={color} />
        <rect x="70" y="22" width="20" height="50" fill={color} />
        <path d="M80 0L83 8L91 11L83 14L80 22L77 14L69 11L77 8L80 0Z" fill={color} />
    </svg>
);

function App() {
    const [tab, setTab] = useState('path');
    const [userData, setUserData] = useState<any>(null);
    const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);

    // Получаем Telegram ID один раз
    const getTgId = (): string => {
        const tgUser = WebApp.initDataUnsafe?.user;
        return tgUser?.id?.toString() || '12345678';
    };

    useEffect(() => {
        try {
            WebApp.ready();
            WebApp.expand();
            WebApp.headerColor = '#1E3A8A';
            WebApp.backgroundColor = '#1E3A8A';
        } catch (e) {
            console.log('Запущено вне Telegram');
        }
        fetchUser(getTgId());
    }, []);

    const fetchUser = async (tgId: string) => {
        try {
            const user = WebApp.initDataUnsafe?.user;
            const firstName = user?.first_name || '';
            const username = user?.username || '';

            const res = await axios.get(`${API_URL}/user/${tgId}`, {
                params: { firstName, username }
            });
            setUserData(res.data);

            if (res.data?.goals?.length > 0) {
                setActiveGoal(res.data.goals.find((g: any) => g.status === 'ACTIVE') || res.data.goals[0]);
            }
        } catch (e) {
            console.error('[FETCH USER]', e);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => fetchUser(getTgId());

    if (loading) return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(180deg, #1E3A8A 0%, #2563EB 100%)', zIndex: 9999
        }}>
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
                <div style={{
                    width: 80, height: 80, borderRadius: 24,
                    background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)'
                }}>
                    <BrandLogo size={42} color="white" />
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="app-container">
            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {tab === 'profile' && <ProfileView user={userData} onSave={() => refreshData()} onNavigate={(t: string) => setTab(t)} />}
                    {tab === 'analytics' && <AnalyticsView user={userData} />}
                    {tab === 'path' && <PathView user={userData} onUpdate={refreshData} onNavigateToTracker={() => setTab('tracker')} />}
                    {tab === 'tracker' && <TrackerView user={userData} goal={activeGoal} onUpdate={refreshData} />}
                    {tab === 'requests' && <RequestsView user={userData} />}
                    {tab === 'ideas' && <IdeasView user={userData} />}
                    {tab === 'partners' && <PartnersView />}
                </motion.div>
            </AnimatePresence>

            <nav className="nav-bar">
                <div className={`nav-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
                    <User size={22} /> <span>Профиль</span>
                </div>
                <div className={`nav-item ${tab === 'tracker' ? 'active' : ''}`} onClick={() => setTab('tracker')}>
                    <Plus size={22} /> <span>ШАГ</span>
                </div>
                <div className={`nav-item ${tab === 'path' ? 'active' : ''}`} onClick={() => setTab('path')}>
                    <Map size={22} /> <span>Путь</span>
                </div>
                <div className={`nav-item ${tab === 'partners' ? 'active' : ''}`} onClick={() => setTab('partners')}>
                    <Users size={22} /> <span>Досуг</span>
                </div>
            </nav>
        </div>
    );
}

// --- ВИД: Профиль ---
const ProfileView = ({ user, onSave, onNavigate }: any) => {
    // Данные из Telegram SDK (автозаполнение)
    const tgUser = WebApp.initDataUnsafe?.user;
    const tgFirstName = tgUser?.first_name || '';
    const tgUsername = tgUser?.username || '';

    const [isEditing, setIsEditing] = useState(!user?.firstName); // Если нет имени — сразу редактирование
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        firstName: user?.firstName || tgFirstName || '',
        lastName: user?.lastName || '',
        occupation: user?.occupation || '',
        phone: user?.phone || '',
        notificationTime: user?.notificationTime || '20:00'
    });

    useEffect(() => {
        if (user) {
            setForm({
                firstName: user.firstName || tgFirstName || '',
                lastName: user.lastName || '',
                occupation: user.occupation || '',
                phone: user.phone || '',
                notificationTime: user.notificationTime || '20:00'
            });
            // Если имя уже есть — не нужно редактировать
            if (user.firstName) setIsEditing(false);
        }
    }, [user]);


    const handleSave = async () => {
        setLoading(true);
        try {
            const rawTgId = tgUser?.id || 12345678;
            const tgIdString = rawTgId.toString();

            await axios.post(`${API_URL}/user/profile`, {
                telegramId: tgIdString,
                ...form
            });

            safeHaptic('success');
            onSave();
            setIsEditing(false);
            safeAlert('Профиль обновлен! ✅');
        } catch (e) {
            console.error('[SAVE ERROR]:', e);
            safeAlert('Ошибка при сохранении');
        } finally {
            setLoading(false);
        }
    };


    // --- 2. РЕЖИМ РЕДАКТИРОВАНИЯ ---
    if (isEditing) {
        return (
            <div className="card" style={{ marginTop: 24, padding: '24px' }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Редактирование</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, marginLeft: 4 }}>ИМЯ</label>
                        <div className="input-field">
                            <User size={18} color="var(--accent-blue)" />
                            <input placeholder="Твое имя" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, marginLeft: 4 }}>
                            ВРЕМЯ ОТЧЕТА (Бот напишет)
                        </label>
                        <div className="input-field">
                            <Clock size={18} color="var(--accent-blue)" />
                            <input
                                type="time"
                                value={form.notificationTime}
                                onChange={e => setForm({ ...form, notificationTime: e.target.value })}
                                style={{ fontWeight: 600, fontSize: 16 }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button onClick={() => setIsEditing(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 16, height: 50, fontWeight: 600 }}>
                            Отмена
                        </button>
                        <button className="primary" onClick={handleSave} disabled={loading} style={{ flex: 2, height: 50, borderRadius: 16 }}>
                            {loading ? '...' : 'СОХРАНИТЬ'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 3. ПРОФИЛЬ (ПРОСМОТР) ---
    return (
        <div style={{ paddingBottom: 100 }}>
            <div className="card" style={{ marginTop: 24, padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20, background: 'var(--brand-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
                    }}>
                        <User size={32} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Личный кабинет</h2>
                        <p style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>● АВТОРИЗОВАН</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Бонусная система: 12 месяцев */}
                    {(() => {
                        const completedGoals = user?.goals?.filter((g: any) => g.status === 'COMPLETED') || [];
                        const totalMonths = completedGoals.reduce((sum: number, g: any) => sum + (g.duration || 0), 0);
                        const progress = Math.min((totalMonths / 12) * 100, 100);
                        return (
                            <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', padding: 16, borderRadius: 16, color: 'white', marginBottom: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Trophy size={18} color="#F59E0B" />
                                        <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>Путь к награде</span>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 13, color: '#F59E0B' }}>{totalMonths} / 12 мес.</div>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: '#F59E0B', borderRadius: 4 }} />
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 10, lineHeight: 1.3 }}>
                                    Суммируй 12 месяцев завершённых целей, чтобы получить уникальный подарок и особое признание.
                                </div>
                            </div>
                        );
                    })()}

                    {/* Блок Пользователь */}
                    <div style={{ background: 'rgba(37, 99, 235, 0.04)', padding: 16, borderRadius: 16, border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <User size={14} color="var(--accent-blue)" />
                            <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase' }}>Пользователь</span>
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800 }}>{user.firstName} {user.lastName}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{user.occupation || 'Нет описания'}</div>
                    </div>

                    {/* Блок Время */}
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Clock size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Время отчета</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {user.notificationTime || '20:00'} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>(ежедневно)</span>
                        </div>
                    </div>

                    {/* Блок Контакты */}
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Phone size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Контакты</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{user.phone || `@${user.username}` || 'Не указано'}</div>
                    </div>

                    {/* Дополнительные разделы (Запросы, Идея) */}
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Итоги скрыты по просьбе Вани (в хранении) */}

                        <div onClick={() => onNavigate('requests')} style={{ background: 'white', padding: 16, borderRadius: 16, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: 'rgba(37,99,235,0.1)', padding: 8, borderRadius: 10, color: 'var(--accent-blue)' }}><MessageSquare size={18} /></div>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Связь с проектом</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </div>

                        <div onClick={() => onNavigate('ideas')} style={{ background: 'white', padding: 16, borderRadius: 16, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: 'rgba(37,99,235,0.1)', padding: 8, borderRadius: 10, color: 'var(--accent-blue)' }}><Lightbulb size={18} /></div>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Предложить идею</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button onClick={() => setIsEditing(true)} style={{
                            flex: 1, background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                            padding: '14px', borderRadius: '14px', fontWeight: 700
                        }}>
                            Редактировать
                        </button>
                    </div>
                </div>
            </div>


        </div>
    );
};

// --- КОМПОНЕНТ: График прогресса ---
// --- КОМПОНЕНТ: График прогресса ---
const GoalChart = ({ steps, metric }: { steps: any[], metric?: string }) => {
    const [mode, setMode] = useState<'PATH' | 'METRIC'>(metric ? 'METRIC' : 'PATH');

    // Сортировка по дате (старые -> новые)
    const sortedSteps = [...steps].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // --- ДАННЫЕ ДЛЯ ГРАФИКА ПУТИ ---
    let currentLevel = 0;
    const pathPoints = sortedSteps.map((step, index) => {
        if (step.evaluation === 'GREEN') currentLevel += 1;
        if (step.evaluation === 'RED') currentLevel -= 1;
        return { x: index, y: currentLevel, step, type: 'path' };
    });
    // Добавляем старт
    const allPathPoints = [{ x: -1, y: 0, step: { content: 'Старт', createdAt: new Date().toISOString(), evaluation: 'START' }, type: 'path' }, ...pathPoints];

    // --- ДАННЫЕ ДЛЯ ГРАФИКА МЕТРИКИ ---
    const metricSteps = sortedSteps.filter(s => s.value !== null && s.value !== undefined);
    const metricPoints = metricSteps.map((step, index) => ({ x: index, y: step.value, step, type: 'metric' }));

    const activePoints = mode === 'PATH' ? allPathPoints : metricPoints;

    const width = 300;
    const height = 180; // Чуть выше для красоты
    const padding = 20;

    // Если данных мало
    if (activePoints.length < 2 && mode === 'PATH') return null;
    if (activePoints.length < 2 && mode === 'METRIC') return null;

    const minY = Math.min(...activePoints.map(p => p.y));
    const maxY = Math.max(...activePoints.map(p => p.y));
    const rangeY = Math.max(maxY - minY, mode === 'METRIC' ? (maxY * 0.1 || 10) : 2);

    const getX = (index: number) => padding + (index + 1) * ((width - 2 * padding) / (activePoints.length));
    const getY = (val: number) => height - padding - 40 - ((val - minY) / rangeY) * (height - 2 * padding - 60);

    const svgPath = activePoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.y)}`
    ).join(' ');

    return (
        <div style={{
            marginTop: 20,
            padding: '20px 16px',
            background: 'rgba(248, 250, 252, 0.8)',
            borderRadius: 24,
            border: '1.5px solid #edf2f7'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ДИНАМИКА ПУТИ
                </div>
                <div style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#94a3b8',
                    background: '#e2e8f0',
                    padding: '4px 10px',
                    borderRadius: 10,
                    opacity: 0.8
                }}>
                    Нажми на точку
                </div>
            </div>

            <div style={{ position: 'relative', height: height - 40 }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height - 40}`} style={{ overflow: 'visible' }}>
                    {/* Пунктирная линия нуля */}
                    <line
                        x1={padding} y1={getY(0)}
                        x2={width - padding} y2={getY(0)}
                        stroke="#cbd5e1" strokeWidth="1.5"
                        strokeDasharray="4 4"
                    />

                    {/* Линия пути */}
                    <path
                        d={svgPath}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Точки */}
                    {activePoints.map((p, i) => {
                        let color = '#94a3b8'; // Старт
                        if (p.step.evaluation === 'GREEN') color = '#10B981';
                        if (p.step.evaluation === 'RED') color = '#EF4444';
                        if (p.step.evaluation === 'YELLOW') color = '#F59E0B';

                        return (
                            <g key={i} onClick={() => safeAlert(p.step.content)}>
                                <circle
                                    cx={getX(i)} cy={getY(p.y)} r="6"
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="2.5"
                                    style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// --- КОМПОНЕНТ: Карточка цели в списке ---
const GoalCard = ({ goal, onSelect, onDelete }: { goal: any; onSelect: (g: any) => void; onDelete: (e: any, id: number) => void }) => {
    const [activeStepId, setActiveStepId] = useState<number | null>(null);
    const steps = [...(goal.steps || [])];

    const greenCount = steps.filter((s: any) => s.evaluation === 'GREEN').length;
    const redCount = steps.filter((s: any) => s.evaluation === 'RED').length;
    const yellowCount = steps.filter((s: any) => s.evaluation === 'YELLOW').length;

    return (
        <div key={goal.id} className="card"
            onClick={() => goal.status === 'ACTIVE' && !activeStepId && onSelect(goal)}
            style={{
                padding: 0, overflow: 'hidden',
                cursor: goal.status === 'COMPLETED' ? 'default' : 'pointer',
                border: goal.status === 'COMPLETED' ? '1px solid #10B981' : '1px solid var(--border-color)',
                position: 'relative', marginBottom: 16
            }}
        >
            <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, paddingRight: 40 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: goal.category === 'BUSINESS' ? 'var(--accent-blue)' : '#8B5CF6', marginBottom: 4, textTransform: 'uppercase' }}>
                            {goal.category === 'BUSINESS' ? '💼 Деловая' : '👤 Личная'}
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{goal.description}</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                        <div style={{
                            padding: '4px 10px', background: goal.status === 'COMPLETED' ? '#10B981' : 'var(--accent-blue)',
                            color: 'white', borderRadius: 8, fontSize: 11, fontWeight: 900
                        }}>
                            {goal.status === 'COMPLETED' ? '🏁' : `${goal.duration}м`}
                        </div>
                        <button
                            onClick={(e) => onDelete(e, goal.id)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '8px', borderRadius: 10, color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> До {new Date(goal.deadline).toLocaleDateString('ru-RU')}</span>
                    {steps.length > 0 && (
                        <span style={{ display: 'flex', gap: 8 }}>
                            <span style={{ color: '#10B981', fontWeight: 800 }}>▲ {greenCount}</span>
                            {yellowCount > 0 && <span style={{ color: '#F59E0B', fontWeight: 800 }}>⏳ {yellowCount}</span>}
                            {redCount > 0 && <span style={{ color: '#EF4444', fontWeight: 800 }}>▼ {redCount}</span>}
                        </span>
                    )}
                </div>
            </div>

            {/* Зона шагов — вертикальный таймлайн */}
            <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                padding: '20px 20px', borderTop: '1px solid var(--border-color)',
                position: 'relative', overflow: 'hidden'
            }}>
                {steps.length > 0 ? (
                    <div style={{ position: 'relative', paddingLeft: 32 }}>
                        {/* Вертикальная пунктирная линия */}
                        <div style={{
                            position: 'absolute', left: 14, top: 4, bottom: 4,
                            width: 2, background: 'repeating-linear-gradient(to bottom, #cbd5e1 0px, #cbd5e1 6px, transparent 6px, transparent 12px)',
                            borderRadius: 1, opacity: 0.6
                        }} />

                        {steps.slice(0, 7).map((step: any, idx: number) => {
                            let dotColor = '#10B981';
                            let dotBg = 'rgba(16,185,129,0.08)';
                            let label = '▲ Вперёд';

                            if (step.evaluation === 'RED') {
                                dotColor = '#EF4444';
                                dotBg = 'rgba(239,68,68,0.08)';
                                label = '▼ Назад';
                            } else if (step.evaluation === 'YELLOW') {
                                dotColor = '#F59E0B';
                                dotBg = 'rgba(245, 158, 11, 0.08)';
                                label = '⏳ Ожидание';
                            }

                            const isActive = activeStepId === step.id;
                            const isLatest = idx === 0 && goal.status === 'ACTIVE';

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.06, duration: 0.35 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveStepId(isActive ? null : step.id);
                                        WebApp.HapticFeedback?.impactOccurred('light');
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 14,
                                        position: 'relative', cursor: 'pointer',
                                        marginBottom: idx < Math.min(steps.length, 7) - 1 ? 6 : 0,
                                        padding: '8px 12px 8px 16px',
                                        borderRadius: 14,
                                        background: isActive ? dotBg : 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    {/* Точка на линии — центрируется на left:15 (центр линии) */}
                                    <div style={{ position: 'absolute', left: -17, top: 12, transform: 'translateX(-50%)' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isLatest && (
                                                <motion.div
                                                    animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                                    style={{
                                                        position: 'absolute', inset: -5,
                                                        background: dotColor, borderRadius: '50%', opacity: 0.3
                                                    }}
                                                />
                                            )}
                                            <div style={{
                                                width: isLatest ? 14 : 10,
                                                height: isLatest ? 14 : 10,
                                                borderRadius: '50%',
                                                background: isActive ? dotColor : 'white',
                                                border: `2.5px solid ${dotColor}`,
                                                boxShadow: isLatest ? `0 0 8px ${dotColor}40` : 'none',
                                                transition: 'all 0.2s'
                                            }} />
                                        </div>
                                    </div>

                                    {/* Контент шага */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 800, color: dotColor,
                                                textTransform: 'uppercase', letterSpacing: 0.3,
                                            }}>
                                                {label}
                                            </span>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                                                {new Date(step.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                                            lineHeight: 1.4,
                                            overflow: 'hidden',
                                            textOverflow: isActive ? 'unset' : 'ellipsis',
                                            whiteSpace: isActive ? 'normal' : 'nowrap',
                                            transition: 'all 0.2s'
                                        }}>
                                            {step.content}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {steps.length > 7 && (
                            <div style={{ paddingLeft: 16, marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                                +{steps.length - 7} ещё...
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => goal.status === 'ACTIVE' && onSelect(goal)}
                        style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Map size={16} color="#9CA3AF" />
                        </div>
                        <span style={{ fontWeight: 600 }}>Начни свой путь первым шагом!</span>
                    </div>
                )}
            </div>

            <div style={{ padding: '0 20px 16px 20px' }}>
                <div style={{
                    width: '100%',
                    padding: '8px', borderRadius: 10,
                    background: 'rgba(59, 130, 246, 0.05)',
                    color: 'var(--accent-blue)',
                    fontSize: 12, fontWeight: 700,
                    textAlign: 'center',
                    border: '1px dashed rgba(59, 130, 246, 0.2)'
                }}>
                    Нажми для графика и деталей →
                </div>
            </div>
        </div>
    );
};

// --- ВИД: Путь (Список всех целей и добавление шагов) ---
const PathView = ({ user, onUpdate, onNavigateToTracker }: any) => {
    const goals = user?.goals || [];
    const sortedGoals = [...goals].sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const [pathTab, setPathTab] = useState('active');
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [stepText, setStepText] = useState('');
    const [stepEval, setStepEval] = useState<'GREEN' | 'RED' | 'YELLOW'>('GREEN');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [stepValue, setStepValue] = useState('');

    const activeGoals = sortedGoals.filter((g: any) => g.status === 'ACTIVE');
    const completedGoals = sortedGoals.filter((g: any) => g.status === 'COMPLETED');

    const handleDeleteGoal = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        safeConfirm('Удалить эту цель и все её шаги?', async (confirmed) => {
            if (confirmed) {
                try {
                    await axios.delete(`${API_URL}/goals/${id}`);
                    safeAlert('Цель удалена 🗑️');
                    onUpdate();
                } catch (e) {
                    safeAlert('Ошибка удаления');
                }
            }
        });
    };

    const handleStep = async (goalId: number) => {
        if (!stepText || isSaving) return safeAlert('Опиши свой шаг!');
        setIsSaving(true);
        try {
            await axios.post(`${API_URL}/steps`, {
                goalId,
                content: stepText,
                evaluation: stepEval,
                value: stepValue ? parseFloat(stepValue) : null,
                isKey: false
            });
            setStepText('');
            setStepValue('');
            setStepEval('GREEN');
            setSelectedGoal(null);
            safeHaptic(stepEval === 'GREEN' ? 'success' : 'warning');
            safeAlert(stepEval === 'GREEN' ? 'Отличный прогресс! 🚀' : 'Опыт — лучший учитель 💪');
            onUpdate();
        } catch (e) {
            safeAlert('Ошибка при добавлении');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStep = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        safeConfirm('Удалить этот шаг?', async (confirmed) => {
            if (confirmed) {
                try {
                    await axios.delete(`${API_URL}/steps/${id}`);
                    safeAlert('Шаг удален 🗑️');
                    onUpdate();
                    // Если удаленный шаг был частью выбранной цели, обновляем её данные локально
                    if (selectedGoal) {
                        setSelectedGoal({
                            ...selectedGoal,
                            steps: selectedGoal.steps.filter((s: any) => s.id !== id)
                        });
                    }
                } catch (e) {
                    safeAlert('Ошибка удаления');
                }
            }
        });
    };

    const handleEditStep = async (id: number, newContent: string) => {
        try {
            await axios.put(`${API_URL}/steps/${id}`, { content: newContent });
            onUpdate();
            safeHaptic('success');
            // Обновляем локально
            if (selectedGoal) {
                setSelectedGoal({
                    ...selectedGoal,
                    steps: selectedGoal.steps.map((s: any) => s.id === id ? { ...s, content: newContent } : s)
                });
            }
        } catch (e) {
            safeAlert('Ошибка обновления');
        }
    };

    if (goals.length === 0) return (
        <div className="card" style={{ marginTop: 60, textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <div style={{ width: 88, height: 88, borderRadius: 24, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: 'var(--accent-blue)' }}>
                <Target size={40} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Поставь свою цель</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 15, lineHeight: 1.5, maxWidth: 280 }}>
                Твой путь начнется здесь. Создай свою первую цель, чтобы начать движение.
            </p>
            <button
                className="primary"
                onClick={onNavigateToTracker}
                style={{
                    width: '100%', maxWidth: 260, height: 56,
                    fontSize: 15, fontWeight: 800,
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                }}
            >
                <Plus size={20} />
                СОЗДАТЬ ЦЕЛЬ
            </button>
        </div>
    );

    return (
        <div style={{ paddingTop: 50, paddingBottom: 100, paddingLeft: 16, paddingRight: 16 }}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, paddingLeft: 0 }}>
                    <BrandLogo size={34} color="white" />
                    <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: -0.5, lineHeight: 1 }}>{selectedGoal ? selectedGoal.description : 'Твой путь'}</h2>
                    {!selectedGoal && (
                        <button
                            onClick={onNavigateToTracker}
                            style={{
                                marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none',
                                color: 'white', width: 44, height: 44, borderRadius: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Plus size={24} />
                        </button>
                    )}
                    {selectedGoal && (
                        <button onClick={() => { setSelectedGoal(null); setStepEval('GREEN'); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                            ← Назад
                        </button>
                    )}
                </div>

                {!selectedGoal && (
                    <div style={{ display: 'flex', gap: 8, background: 'transparent', padding: 4, borderRadius: 14 }}>
                        <button
                            onClick={() => setPathTab('active')}
                            style={{
                                flex: 1, height: 36, borderRadius: 10, border: 'none',
                                background: pathTab === 'active' ? 'white' : 'transparent',
                                color: pathTab === 'active' ? 'var(--text-primary)' : 'rgba(255, 255, 255, 0.6)',
                                fontWeight: 800, fontSize: 12, boxShadow: pathTab === 'active' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            Активные ({activeGoals.length})
                        </button>
                        <button
                            onClick={() => setPathTab('completed')}
                            style={{
                                flex: 1, height: 36, borderRadius: 10, border: 'none',
                                background: pathTab === 'completed' ? 'white' : 'transparent',
                                color: pathTab === 'completed' ? 'var(--text-primary)' : 'rgba(255, 255, 255, 0.6)',
                                fontWeight: 800, fontSize: 12, boxShadow: pathTab === 'completed' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            Архив ({completedGoals.length})
                        </button>
                    </div>
                )}
            </div>



            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedGoal ? (() => {
                    const allSteps = [...(selectedGoal.steps || [])];
                    const greenCount = allSteps.filter((s: any) => s.evaluation !== 'RED').length;
                    const redCount = allSteps.filter((s: any) => s.evaluation === 'RED').length;
                    const isCompleted = selectedGoal.status === 'COMPLETED';

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Информация о цели */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <div style={{ padding: '4px 10px', background: 'rgba(37,99,235,0.06)', borderRadius: 8, fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
                                        {selectedGoal.category === 'BUSINESS' ? '💼 ДЕЛОВАЯ' : '👤 ЛИЧНАЯ'}
                                    </div>
                                    <div style={{
                                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                        background: isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(37,99,235,0.1)',
                                        color: isCompleted ? '#10B981' : 'var(--accent-blue)'
                                    }}>
                                        {isCompleted ? '🏁 ЗАВЕРШЕНА' : '🔥 АКТИВНА'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                    {isEditingTitle ? (
                                        <input
                                            autoFocus
                                            value={editedTitle}
                                            onChange={(e) => setEditedTitle(e.target.value)}
                                            onBlur={() => {
                                                if (editedTitle && editedTitle !== selectedGoal.description) {
                                                    axios.put(`${API_URL}/goals/${selectedGoal.id}`, { description: editedTitle }).then(() => {
                                                        onUpdate();
                                                        WebApp.HapticFeedback?.notificationOccurred('success');
                                                    }).catch((e) => WebApp.showAlert('Ошибка обновления'));
                                                }
                                                setIsEditingTitle(false);
                                            }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            style={{ width: '100%', fontSize: 20, fontWeight: 800, border: 'none', borderBottom: '2px solid var(--accent-blue)', outline: 'none', background: 'transparent', padding: '4px 0', fontFamily: 'var(--font-main)' }}
                                        />
                                    ) : (
                                        <h3
                                            onClick={() => { setEditedTitle(selectedGoal.description); setIsEditingTitle(true); }}
                                            style={{ fontSize: 20, fontWeight: 800, marginBottom: 0, lineHeight: 1.3, flex: 1, cursor: 'pointer' }}
                                        >
                                            {selectedGoal.description} <span style={{ fontSize: 16, color: '#cbd5e1', verticalAlign: 'middle', marginLeft: 6 }}>✏️</span>
                                        </h3>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <span>📅 До {new Date(selectedGoal.deadline).toLocaleDateString('ru-RU')}</span>
                                    {allSteps.length > 0 && (
                                        <span style={{ display: 'flex', gap: 8 }}>
                                            <span style={{ color: '#10B981', fontWeight: 800 }}>▲ {greenCount}</span>
                                            {redCount > 0 && <span style={{ color: '#EF4444', fontWeight: 800 }}>▼ {redCount}</span>}
                                        </span>
                                    )}
                                </div>

                                {/* ГРАФИК */}
                                {allSteps.length > 1 && <GoalChart steps={allSteps} metric={selectedGoal.metric || undefined} />}
                            </div>

                            {/* Форма добавления шага — только для активных целей */}
                            {!isCompleted && (
                                <div className="card" style={{ padding: 20 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Новый шаг</span>

                                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setStepEval('GREEN')}
                                            style={{
                                                flex: 1, padding: '10px 4px', borderRadius: 12,
                                                border: stepEval === 'GREEN' ? '2px solid #10B981' : '1.5px solid var(--border-color)',
                                                background: stepEval === 'GREEN' ? 'rgba(16,185,129,0.08)' : 'white',
                                                color: stepEval === 'GREEN' ? '#059669' : 'var(--text-muted)',
                                                fontWeight: 800, fontSize: 11, transition: '0.2s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
                                            }}
                                        >
                                            <span style={{ fontSize: 16 }}>🟢</span> ВПЕРЁД
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setStepEval('YELLOW')}
                                            style={{
                                                flex: 1, padding: '10px 4px', borderRadius: 12,
                                                border: stepEval === 'YELLOW' ? '2px solid #F59E0B' : '1.5px solid var(--border-color)',
                                                background: stepEval === 'YELLOW' ? 'rgba(245, 158, 11, 0.08)' : 'white',
                                                color: stepEval === 'YELLOW' ? '#D97706' : 'var(--text-muted)',
                                                fontWeight: 800, fontSize: 11, transition: '0.2s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
                                            }}
                                        >
                                            <span style={{ fontSize: 16 }}>⏳</span> ОЖИДАНИЕ
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setStepEval('RED')}
                                            style={{
                                                flex: 1, padding: '10px 4px', borderRadius: 12,
                                                border: stepEval === 'RED' ? '2px solid #EF4444' : '1.5px solid var(--border-color)',
                                                background: stepEval === 'RED' ? 'rgba(239,68,68,0.08)' : 'white',
                                                color: stepEval === 'RED' ? '#DC2626' : 'var(--text-muted)',
                                                fontWeight: 800, fontSize: 11, transition: '0.2s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
                                            }}
                                        >
                                            <span style={{ fontSize: 16 }}>🔴</span> НАЗАД
                                        </motion.button>
                                    </div>

                                    {selectedGoal.metric && (
                                        <div style={{ marginBottom: 14 }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                                                {selectedGoal.metric}:
                                            </span>
                                            <input
                                                type="number"
                                                placeholder="Введите число..."
                                                value={stepValue}
                                                onChange={(e) => setStepValue(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: 14, border: '1px solid var(--border-color)', outline: 'none', fontSize: 16, background: 'rgba(0,0,0,0.02)' }}
                                            />
                                        </div>
                                    )}

                                    <textarea
                                        placeholder={stepEval === 'GREEN' ? 'Что удалось сделать?...' : stepEval === 'YELLOW' ? 'Чего мы ждем?...' : 'Что пошло не так?...'}
                                        value={stepText}
                                        onChange={(e) => setStepText(e.target.value)}
                                        rows={3}
                                        style={{
                                            width: '100%', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)',
                                            borderRadius: 14, padding: 14, fontSize: 15, outline: 'none', marginBottom: 14,
                                            color: 'var(--text-primary)', resize: 'none'
                                        }}
                                    />
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        className="primary"
                                        onClick={() => handleStep(selectedGoal.id)}
                                        disabled={isSaving}
                                        style={{
                                            width: '100%', height: 52, borderRadius: 14, fontWeight: 800, fontSize: 15,
                                            background: stepEval === 'GREEN'
                                                ? 'linear-gradient(135deg, #10B981, #059669)'
                                                : stepEval === 'YELLOW'
                                                    ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                                                    : 'linear-gradient(135deg, #EF4444, #DC2626)',
                                            boxShadow: stepEval === 'GREEN'
                                                ? '0 6px 20px rgba(16,185,129,0.3)'
                                                : stepEval === 'YELLOW'
                                                    ? '0 6px 20px rgba(245, 158, 11, 0.3)'
                                                    : '0 6px 20px rgba(239,68,68,0.3)',
                                            transition: 'background 0.3s, box-shadow 0.3s',
                                            color: 'white'
                                        }}
                                    >
                                        {isSaving ? 'Сохранение...' : (stepEval === 'GREEN' ? 'ЗАФИКСИРОВАТЬ 🚀' : stepEval === 'YELLOW' ? 'В РЕЖИМ ЖДУНА ⏳' : 'ЗАФИКСИРОВАТЬ 💪')}
                                    </motion.button>
                                </div>
                            )}

                            {/* История шагов */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        История шагов ({allSteps.length})
                                    </span>
                                </div>

                                {allSteps.length > 0 ? (
                                    <div style={{ position: 'relative', paddingLeft: 28 }}>
                                        {/* Вертикальная пунктирная линия */}
                                        <div style={{
                                            position: 'absolute', left: 12, top: 8, bottom: 8,
                                            width: 2, background: 'repeating-linear-gradient(to bottom, #cbd5e1 0px, #cbd5e1 5px, transparent 5px, transparent 10px)',
                                            borderRadius: 1, opacity: 0.5
                                        }} />

                                        {allSteps.map((step: any, idx: number) => (
                                            <HistoryStepItem
                                                key={step.id}
                                                step={step}
                                                idx={idx}
                                                isLast={idx === allSteps.length - 1}
                                                onDelete={handleDeleteStep}
                                                onEdit={handleEditStep}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                                        Шагов пока нет. {!isCompleted && 'Сделай первый шаг выше! ☝️'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })() : (
                    pathTab === 'active' ? (
                        activeGoals.length > 0 ? activeGoals.map(g => <GoalCard key={g.id} goal={g} onSelect={setSelectedGoal} onDelete={handleDeleteGoal} />) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: 14 }}>Пока нет активных целей</p>
                            </div>
                        )
                    ) : (
                        completedGoals.length > 0 ? completedGoals.map(g => <GoalCard key={g.id} goal={g} onSelect={setSelectedGoal} onDelete={handleDeleteGoal} />) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: 14 }}>Архив пуст</p>
                            </div>
                        )
                    )
                )}
            </div>
        </div>
    );
};


// --- КОМПОНЕНТ: Элемент истории шага ---
const HistoryStepItem = ({ step, idx, isLast, onDelete, onEdit }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(step.content);

    let dotColor = '#10B981'; // GREEN
    let bgColor = '#D1FAE5';

    if (step.evaluation === 'RED') {
        dotColor = '#EF4444';
        bgColor = '#FEE2E2';
    } else if (step.evaluation === 'YELLOW') {
        dotColor = '#F59E0B';
        bgColor = '#FEF3C7';
    }

    const isFirst = idx === 0;

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editedContent.trim() && editedContent !== step.content) {
            onEdit(step.id, editedContent);
        }
        setIsEditing(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            onClick={() => {
                if (!isEditing) {
                    setIsOpen(!isOpen);
                    WebApp.HapticFeedback?.impactOccurred('light');
                }
            }}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                position: 'relative',
                padding: '12px 0',
                cursor: 'pointer',
                borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)'
            }}
        >
            {/* Точка */}
            <div style={{ position: 'absolute', left: -15, top: 16, transform: 'translateX(-50%)' }}>
                <div style={{
                    width: isFirst ? 14 : 10,
                    height: isFirst ? 14 : 10,
                    borderRadius: '50%',
                    background: dotColor,
                    border: `2px solid ${bgColor}`,
                    boxShadow: isFirst ? `0 0 8px ${dotColor}60` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: 'white',
                    transition: 'all 0.3s'
                }} />
            </div>

            {/* Контент */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 800, color: dotColor,
                        textTransform: 'uppercase', letterSpacing: 0.3
                    }}>
                        {step.evaluation === 'RED' ? '🔻 Шаг назад' : (step.evaluation === 'YELLOW' ? '⏳ Ожидание' : '🚀 Шаг вперёд')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                            {new Date(step.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOpen && !isEditing && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                    style={{ padding: 4, color: 'var(--text-muted)' }}
                                >
                                    <Edit2 size={12} />
                                </div>
                                <div
                                    onClick={(e) => onDelete(e, step.id)}
                                    style={{ padding: 4, color: '#EF4444' }}
                                >
                                    <Trash2 size={12} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isOpen ? (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ paddingTop: 4 }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <textarea
                                            autoFocus
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            style={{
                                                width: '100%', padding: 8, fontSize: 14, borderRadius: 8,
                                                border: '1.5px solid var(--accent-blue)', outline: 'none',
                                                background: 'white', color: 'var(--text-primary)',
                                                fontFamily: 'inherit', resize: 'vertical'
                                            }}
                                            rows={3}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={handleSave}
                                                style={{ flex: 1, padding: '6px 0', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                                            >
                                                Сохранить
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditedContent(step.content); }}
                                                style={{ flex: 1, padding: '6px 0', background: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                                        lineHeight: 1.5
                                    }}>
                                        {step.content}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {step.content ? (step.content.length > 40 ? step.content.slice(0, 40) + '...' : step.content) : 'Нажми, чтобы прочитать...'}
                            </span>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// --- ВИД: Запросы и Вакансии ---
const RequestsView = ({ user }: any) => {
    const [type, setType] = useState('REQUEST'); // REQUEST | OFFER
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return safeAlert('Напишите что-нибудь!');
        setIsSending(true);
        try {
            const tgUser = WebApp.initDataUnsafe?.user;
            await axios.post(`${API_URL}/requests`, {
                telegramId: user?.telegramId || tgUser?.id,
                username: user?.username || tgUser?.username,
                type: type === 'REQUEST' ? 'ЗАПРОС ПОМОЩИ' : 'ПРЕДЛОЖЕНИЕ',
                content: text
            });
            setText('');
            safeAlert('Отправлено! Мы напишем тебе лично в течение 3 дней.');
        } catch (e) {
            safeAlert('Ошибка отправки');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: 8, borderRadius: 12, color: '#8B5CF6' }}>
                    <Mail size={24} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>Запросы и вакансии</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                Здесь вы можете оставить запрос на помощь или предложить свои услуги/вакансию.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                    onClick={() => setType('REQUEST')}
                    style={{
                        flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--border-color)',
                        background: type === 'REQUEST' ? 'var(--accent-blue)' : 'white',
                        color: type === 'REQUEST' ? 'white' : 'var(--text-primary)',
                        fontWeight: 700, fontSize: 13, transition: '0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    <HandHelping size={18} />
                    ЗАПРОС
                </button>
                <button
                    onClick={() => setType('OFFER')}
                    style={{
                        flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--border-color)',
                        background: type === 'OFFER' ? 'var(--accent-blue)' : 'white',
                        color: type === 'OFFER' ? 'white' : 'var(--text-primary)',
                        fontWeight: 700, fontSize: 13, transition: '0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    <Briefcase size={18} />
                    ПРЕДЛОЖЕНИЕ
                </button>
            </div>

            <textarea
                placeholder={type === 'REQUEST' ? "В чем вам нужна помощь? Опишите вашу проблему..." : "Кого вы ищете или что предлагаете? Опишите детали..."}
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                    width: '100%', padding: 16, borderRadius: 16,
                    background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)',
                    fontSize: 15, outline: 'none', marginBottom: 24, resize: 'none',
                    color: 'var(--text-primary)'
                }}
            />

            <button
                className="primary"
                onClick={handleSubmit}
                disabled={isSending}
                style={{
                    width: '100%', height: 50, borderRadius: 16, fontSize: 15, fontWeight: 800,
                    background: isSending ? '#ccc' : (type === 'REQUEST' ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'linear-gradient(135deg, #10B981, #059669)'),
                    boxShadow: isSending ? 'none' : (type === 'REQUEST' ? '0 8px 20px rgba(139, 92, 246, 0.3)' : '0 8px 20px rgba(16, 185, 129, 0.3)'),
                    transition: 'all 0.3s'
                }}
            >
                {isSending ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ'}
            </button>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Clock size={14} /> Мы напишем тебе лично в течение трех дней
            </div>
        </div>
    );
};

// --- ВИД: Трекер (ТОЛЬКО Создание цели) ---
const TrackerView = ({ user, onUpdate }: any) => {
    const [text, setText] = useState('');
    const [duration, setDuration] = useState(6);
    const [category, setCategory] = useState('PERSONAL');
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('23:59');
    const [metricName, setMetricName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    const minDate = new Date().toISOString().split('T')[0];
    const activeGoalsCount = user?.goals?.filter((g: any) => g.status === 'ACTIVE').length || 0;

    const handleCreateGoal = async () => {
        if (!text || (showCalendar && !customDate)) {
            safeAlert('Заполни все поля!');
            return;
        }

        setIsSaving(true);
        try {
            const tgId = WebApp.initDataUnsafe?.user?.id?.toString() || '12345678';
            await axios.post(`${API_URL}/goals`, {
                telegramId: tgId,
                description: text,
                category: category,
                duration: showCalendar ? 0 : duration,
                customDeadline: showCalendar ? `${customDate}T${customTime}:00` : null,
                metric: metricName.trim() || null
            });
            setText('');
            setMetricName('');
            safeHaptic('success');
            safeAlert('🎯 Цель поставлена! Теперь делай ШАГИ во вкладке «Путь».');
            onUpdate();
        } catch (e: any) {
            console.error('[GOAL ERROR]', e);
            const status = e.response?.status ? `[${e.response.status}] ` : '';
            const errorMsg = e.response?.data?.error || e.message || 'Ошибка сети';
            safeAlert(`${status}Ошибка: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: 10, borderRadius: 12 }}>
                        <BrandLogo size={24} color="#2563EB" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800 }}>Новая цель</h2>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: activeGoalsCount >= 3 ? '#EF4444' : 'var(--text-muted)' }}>
                    {activeGoalsCount}/3 АКТИВНО
                </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                <b>🎯 Поставь свою цель:</b> опиши свой вызов, выбери категорию и срок. Бот будет напоминать тебе о прогрессе и принимать отчеты прямо в чате!
            </p>

            <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Сфера жизни</span>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => setCategory('PERSONAL')}
                        style={{
                            flex: 1, height: 52, borderRadius: 16, border: '1px solid var(--border-color)',
                            background: category === 'PERSONAL' ? 'var(--accent-blue)' : 'white',
                            color: category === 'PERSONAL' ? 'white' : 'var(--text-primary)',
                            fontWeight: 700, fontSize: 13, transition: '0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                    >
                        <User size={18} />
                        ЛИЧНАЯ
                    </button>
                    <button
                        onClick={() => setCategory('BUSINESS')}
                        style={{
                            flex: 1, height: 52, borderRadius: 16, border: '1px solid var(--border-color)',
                            background: category === 'BUSINESS' ? 'var(--accent-blue)' : 'white',
                            color: category === 'BUSINESS' ? 'white' : 'var(--text-primary)',
                            fontWeight: 700, fontSize: 13, transition: '0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                    >
                        <Briefcase size={18} />
                        ДЕЛОВАЯ
                    </button>
                </div>
            </div>

            <div style={{ background: 'rgba(37,99,235,0.03)', borderRadius: 20, padding: 16, border: '1px solid var(--border-color)', marginBottom: 24 }}>
                <textarea
                    placeholder="Например: Прочитать 10 книг или запустить проект..."
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 16, outline: 'none', color: 'var(--text-primary)', resize: 'none' }}
                />
            </div>

            {/* Поле для метрики */}
            <div style={{ padding: '0 8px', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Ключевой показатель (опционально)</span>
                <input
                    type="text"
                    placeholder="Что измеряем? (например: Выручка, Вес)"
                    value={metricName}
                    onChange={(e) => setMetricName(e.target.value)}
                    style={{
                        width: '100%', height: 50, borderRadius: 16, border: '1px solid var(--border-color)',
                        padding: '0 16px', fontSize: 15, background: 'white', color: 'var(--text-primary)',
                        outline: 'none'
                    }}
                />
            </div>

            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Срок достижения</span>
                    <button onClick={() => setShowCalendar(!showCalendar)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: 13, fontWeight: 700 }}>
                        {showCalendar ? 'Предустановки' : 'Другая дата'}
                    </button>
                </div>

                {!showCalendar ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {[0, 2, 4, 6, 12].map(m => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                style={{
                                    height: 50, borderRadius: 14, border: '1px solid var(--border-color)',
                                    background: duration === m ? 'var(--accent-blue)' : 'white',
                                    color: duration === m ? 'white' : 'var(--text-primary)',
                                    fontWeight: 800, fontSize: 13, transition: '0.2s'
                                }}
                            >
                                {m === 0 ? '1 мин' : `${m} мес.`}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            type="date"
                            min={minDate}
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            style={{
                                flex: 2, height: 56, borderRadius: 16, border: '2px solid var(--accent-blue)',
                                padding: '0 16px', fontSize: 16, fontWeight: 600, background: 'white',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <input
                            type="time"
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            style={{
                                flex: 1, height: 56, borderRadius: 16, border: '2px solid var(--accent-blue)',
                                padding: '0 12px', fontSize: 16, fontWeight: 600, background: 'white',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                )}
            </div>

            <button
                className="primary"
                onClick={handleCreateGoal}
                disabled={isSaving || activeGoalsCount >= 3}
                style={{ width: '100%', height: 60, borderRadius: 20, fontSize: 16, fontWeight: 800, boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)', opacity: activeGoalsCount >= 3 ? 0.5 : 1 }}
            >
                {activeGoalsCount >= 3 ? 'ЛИМИТ ЦЕЛЕЙ ДОСТИГНУТ' : (isSaving ? 'СОЗДАНИЕ...' : 'НАЧАТЬ ПУТЬ')}
            </button>
        </div>
    );
};

// --- ВИД: Идеи ---
const IdeasView = ({ user }: any) => {
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setStatus('SENDING');
        try {
            await axios.post(`${API_URL}/ideas`, {
                telegramId: user.telegramId,
                username: user.username,
                content
            });
            setStatus('SUCCESS');
            setContent('');
            setTimeout(() => setStatus(null), 3000);
        } catch (e) {
            setStatus('ERROR');
            setTimeout(() => setStatus(null), 3000);
        }
    };

    return (
        <div style={{ paddingBottom: 20 }}>
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                        background: 'rgba(255, 193, 7, 0.1)', padding: 10, borderRadius: 14,
                        color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Lightbulb size={24} />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>Есть идея?</h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                    Чего не хватает в приложении? Какую фишку добавить? Напиши, и мы это реализуем!
                    <br /><br />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Gift size={16} color="var(--accent-red)" /> <b>За крутые идеи дарим бонусы.</b>
                    </span>
                </p>
            </div>

            <div className="card">
                <textarea
                    placeholder="Например: хочу темную тему и календарь..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{
                        width: '100%', minHeight: 140,
                        background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)',
                        borderRadius: 16, padding: 16,
                        color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.5,
                        resize: 'none', outline: 'none',
                        caretColor: 'var(--accent-blue)',
                        fontFamily: 'var(--font-main)'
                    }}
                />
                <button
                    className="primary"
                    onClick={handleSubmit}
                    disabled={status === 'SENDING' || !content.trim()}
                    style={{
                        marginTop: 16, width: '100%', height: 50, borderRadius: 16,
                        background: status === 'SUCCESS' ? '#10B981' : (status === 'ERROR' ? '#EF4444' : 'var(--brand-gradient)'),
                        fontSize: 15, fontWeight: 800,
                        boxShadow: status === 'SUCCESS' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    {status === 'SENDING' ? 'ОТПРАВКА...' : (status === 'SUCCESS' ? <><CheckCircle2 size={18} /> ОТПРАВЛЕНО!</> : (status === 'ERROR' ? 'ОШИБКА' : 'ОТПРАВИТЬ ИДЕЮ'))}
                </button>
            </div>
        </div>
    );
};



// --- ВИД: Партнеры и Досуг ---
const PartnersView = () => {
    const partners = [
        {
            id: 1,
            title: 'Киберспорт (CS)',
            description: 'Любительские и PRO турниры, командные игры.',
            icon: <Gamepad2 size={32} color="var(--accent-blue)" />,
            link: 'https://t.me/+qBt5EejuUSgwZGYy',
            tag: 'Games'
        },
        {
            id: 2,
            title: 'Волейбол',
            description: 'Тренировки, игры и турниры. Сообщество MosVolley.',
            icon: <Trophy size={32} color="var(--accent-cyan)" />,
            link: 'https://t.me/Mos_Volley',
            tag: 'Спорт'
        },
        {
            id: 3,
            title: 'Акселератор',
            description: 'Возможность презентовать проекты и получить инвестиции',
            icon: <Zap size={32} color="var(--accent-gold)" />,
            link: 'https://t.me/+O954bRnpXmMzNzUy',
            tag: 'Бизнес'
        },
        {
            id: 4,
            title: 'Лыжи & Сноуборд',
            description: 'Зимние выезды, горы и адреналин.',
            icon: <Snowflake size={32} color="#fff" />,
            link: 'https://t.me/+bX0L2ufC2ehlOTAy',
            tag: 'Спорт'
        }
    ];

    return (
        <div style={{ paddingBottom: 20 }}>
            <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: 8, borderRadius: 12, color: 'var(--accent-blue)' }}>
                        <Users size={24} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800 }}>Партнеры и Досуг</h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Развивайся не только в делах, но и в сообществе. Наши друзья и проверенные чаты.
                </p>
            </div>

            {partners.map(p => (
                <motion.div
                    key={p.id}
                    className="card"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => p.link !== '#' && WebApp.openTelegramLink(p.link)}
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        padding: '20px'
                    }}
                >
                    <div style={{
                        background: 'rgba(37, 99, 235, 0.1)',
                        padding: 12,
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {p.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: 18 }}>{p.title}</span>
                            <span style={{
                                fontSize: 10,
                                background: 'rgba(255,255,255,0.05)',
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontWeight: 700,
                                color: 'var(--accent-purple)'
                            }}>{p.tag}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.3 }}>{p.description}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default App;
