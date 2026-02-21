import { useState } from 'react';
import { Trophy } from 'lucide-react';

// --- ВИД: Аналитика ---
const AnalyticsView = ({ user }: any) => {
    const [range, setRange] = useState<'MONTH' | 'ALL'>('MONTH');

    // Собираем все шаги всех целей
    const allSteps = user?.goals?.flatMap((g: any) => g.steps.map((s: any) => ({ ...s, goalTitle: g.description }))) || [];

    // Фильтруем по диапазону
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredSteps = allSteps.filter((s: any) => {
        if (range === 'ALL') return true;
        const d = new Date(s.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const green = filteredSteps.filter((s: any) => s.evaluation === 'GREEN').length;
    const red = filteredSteps.filter((s: any) => s.evaluation === 'RED').length;
    const yellow = filteredSteps.filter((s: any) => s.evaluation === 'YELLOW').length;
    const total = green + red + yellow;

    return (
        <div style={{ paddingBottom: 20 }}>
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 12, color: '#10B981' }}>
                            <Trophy size={24} />
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Аналитика</h2>
                    </div>

                    <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                        <button
                            onClick={() => setRange('MONTH')}
                            style={{
                                padding: '6px 12px', borderRadius: 10, border: 'none',
                                background: range === 'MONTH' ? 'white' : 'transparent',
                                color: range === 'MONTH' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: 11, fontWeight: 800, boxShadow: range === 'MONTH' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            МЕСЯЦ
                        </button>
                        <button
                            onClick={() => setRange('ALL')}
                            style={{
                                padding: '6px 12px', borderRadius: 10, border: 'none',
                                background: range === 'ALL' ? 'white' : 'transparent',
                                color: range === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: 11, fontWeight: 800, boxShadow: range === 'ALL' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            ВСЁ
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Всего действий</span>
                        <span style={{ fontSize: 18, fontWeight: 800 }}>{total}</span>
                    </div>

                    <div style={{ height: 12, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                        {total > 0 ? (
                            <>
                                <div style={{ width: `${(green / total) * 100}%`, background: '#10B981' }} />
                                <div style={{ width: `${(yellow / total) * 100}%`, background: '#F59E0B' }} />
                                <div style={{ width: `${(red / total) * 100}%`, background: '#EF4444' }} />
                            </>
                        ) : (
                            <div style={{ width: '100%', background: '#e2e8f0' }} />
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} /> {green} Вперёд</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} /> {yellow} Ожидание</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /> {red} Назад</div>
                    </div>
                </div>
            </div>

            {/* Детализация по целям (если была активность) */}
            {filteredSteps.length > 0 && (
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Последние действия</h3>
                    {filteredSteps.slice(0, 5).map((step: any, idx: number) => (
                        <div key={idx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 0', borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none'
                        }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{step.goalTitle}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(step.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div style={{
                                padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                                background: step.evaluation === 'GREEN' ? 'rgba(16, 185, 129, 0.1)' : (step.evaluation === 'RED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                color: step.evaluation === 'GREEN' ? '#10B981' : (step.evaluation === 'RED' ? '#EF4444' : '#F59E0B')
                            }}>
                                {step.evaluation === 'GREEN' ? '▲' : (step.evaluation === 'RED' ? '▼' : '●')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AnalyticsView;
