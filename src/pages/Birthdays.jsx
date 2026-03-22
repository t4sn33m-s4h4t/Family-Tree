import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

function BirthdayChart({ byMonth }) {
    const data = MONTHS.map((month, idx) => ({
        month: month.slice(0, 3),
        count: byMonth.find(m => m.month === month)?.people.length || 0,
        isCurrent: new Date().getMonth() === idx,
    }))

    const CustomDot = (props) => {
        const { cx, cy, payload } = props
        if (payload.count === 0) return null
        return (
            <circle
                cx={cx} cy={cy} r={payload.isCurrent ? 6 : 4}
                fill={payload.isCurrent ? '#fbbf24' : '#a78bfa'}
                stroke={payload.isCurrent ? 'rgba(251,191,36,0.3)' : 'rgba(167,139,250,0.3)'}
                strokeWidth={payload.isCurrent ? 4 : 3}
            />
        )
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
            <div style={{
                background: 'rgba(20,15,50,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '8px 14px',
            }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '0 0 3px' }}>{label}</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>
                    {payload[0].value} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>birthdays</span>
                </p>
            </div>
        )
    }

    return (
        <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Birthdays per month
                </span>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '24px 8px 12px',
            }}>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#7c3aed" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray="4 4"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="url(#lineGrad)"
                            strokeWidth={2}
                            dot={<CustomDot />}
                            activeDot={{ r: 6, fill: '#a78bfa', stroke: 'rgba(167,139,250,0.4)', strokeWidth: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a78bfa' }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Birthdays</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Current month</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Birthdays() {
    const [people, setPeople] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetch() {
            const snap = await getDocs(collection(db, 'people'))
            setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            setLoading(false)
        }
        fetch()
    }, [])

    const today = new Date()
    const currentYear = today.getFullYear()

    function getDaysUntil(birthDate) {
        const [, month, day] = birthDate.split('-').map(Number)
        let next = new Date(currentYear, month - 1, day)
        if (next < today) next = new Date(currentYear + 1, month - 1, day)
        const diff = next - today
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    function getAge(birthDate) {
        const [year] = birthDate.split('-').map(Number)
        return currentYear - year
    }

    function getBirthMonth(birthDate) {
        return parseInt(birthDate.split('-')[1]) - 1 // 0-indexed
    }

    function getBirthDay(birthDate) {
        return parseInt(birthDate.split('-')[2])
    }

    const withBirthdays = people
        .filter(p => p.birthDate && !p.deathDate)
        .map(p => ({
            ...p,
            daysUntil: getDaysUntil(p.birthDate),
            age: getAge(p.birthDate),
            birthMonth: getBirthMonth(p.birthDate),
            birthDay: getBirthDay(p.birthDate),
        }))

    const todayBirthdays = withBirthdays.filter(p => p.daysUntil === 0)
    const next30 = withBirthdays
        .filter(p => p.daysUntil > 0 && p.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)

    // Group all by month Jan→Dec, sorted by day within month
    const byMonth = MONTHS.map((month, idx) => ({
        month,
        people: withBirthdays
            .filter(p => p.birthMonth === idx)
            .sort((a, b) => a.birthDay - b.birthDay)
    })).filter(m => m.people.length > 0)

    function PersonCard({ person, showDays = false, compact = false }) {
        const isFemale = person.gender === 'female'
        const isToday = person.daysUntil === 0
        const dateStr = `${MONTHS[person.birthMonth].slice(0, 3)} ${person.birthDay}`

        return (
            <div style={{
                background: isToday
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.05))'
                    : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isToday ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 12,
                padding: compact ? '10px 14px' : '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                {/* Avatar */}
                {person.photoURL ? (
                    <img src={person.photoURL} style={{
                        width: compact ? 36 : 44, height: compact ? 36 : 44,
                        borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                        border: `2px solid ${isFemale ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'}`,
                    }} />
                ) : (
                    <div style={{
                        width: compact ? 36 : 44, height: compact ? 36 : 44,
                        borderRadius: '50%', flexShrink: 0,
                        background: isFemale ? 'rgba(244,114,182,0.12)' : 'rgba(96,165,250,0.12)',
                        border: `2px solid ${isFemale ? 'rgba(244,114,182,0.25)' : 'rgba(96,165,250,0.25)'}`,
                        color: isFemale ? '#f472b6' : '#60a5fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: compact ? 14 : 18, fontWeight: 700,
                    }}>
                        {person.name?.charAt(0)}
                    </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        color: 'white', fontWeight: 600,
                        fontSize: compact ? 12 : 13, margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {person.name}
                        {isToday && <span style={{ marginLeft: 6 }}>🎂</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                        {dateStr} · Turns {person.age}
                    </p>
                </div>

                {/* Days badge */}
                {showDays && (
                    <span style={{
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                        background: isToday ? 'rgba(251,191,36,0.2)' : person.daysUntil <= 7 ? 'rgba(167,139,250,0.15)' : 'rgba(96,165,250,0.1)',
                        border: `1px solid ${isToday ? 'rgba(251,191,36,0.35)' : person.daysUntil <= 7 ? 'rgba(167,139,250,0.3)' : 'rgba(96,165,250,0.2)'}`,
                        color: isToday ? '#fbbf24' : person.daysUntil <= 7 ? '#a78bfa' : '#60a5fa',
                        borderRadius: 99, padding: '3px 10px',
                    }}>
                        {isToday ? 'Today!' : `${person.daysUntil}d`}
                    </span>
                )}
            </div>
        )
    }

    function SectionLabel({ text, color = 'rgba(255,255,255,0.25)', lineColor = 'rgba(255,255,255,0.06)' }) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: lineColor }} />
                <span style={{ fontSize: 10, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                    {text}
                </span>
                <div style={{ height: 1, flex: 1, background: lineColor }} />
            </div>
        )
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading...</p>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', padding: '40px 16px' }}>
            <div style={{ maxWidth: 580, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>Birthdays</h1>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '5px 0 0' }}>
                        {withBirthdays.length} members with birthdays
                    </p>
                </div>

                {/* Today */}
                {todayBirthdays.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <SectionLabel text="Today" color="#fbbf24" lineColor="rgba(251,191,36,0.2)" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {todayBirthdays.map(p => <PersonCard key={p.id} person={p} showDays />)}
                        </div>
                    </div>
                )}

                {/* Next 30 days */}
                {next30.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                        <SectionLabel text="Next 30 days" color="#a78bfa" lineColor="rgba(167,139,250,0.2)" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {next30.map(p => <PersonCard key={p.id} person={p} showDays />)}
                        </div>
                    </div>
                )}

                {/* Divider between upcoming and full calendar */}
                <div style={{ marginBottom: 28 }}>
                    <SectionLabel text={`All birthdays — ${currentYear}`} color="rgba(255,255,255,0.2)" />
                </div>

                {/* Jan → Dec */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {byMonth.map(({ month, people: persons }) => (
                        <div key={month}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <span style={{
                                    fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 6, padding: '3px 10px',
                                }}>
                                    {month}
                                </span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                                    {persons.length} {persons.length === 1 ? 'birthday' : 'birthdays'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {persons.map(p => <PersonCard key={p.id} person={p} compact />)}
                            </div>
                        </div>
                    ))}
                </div>

                {withBirthdays.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16,
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>
                            No birthdays found. Add birth dates to family members.
                        </p>
                    </div>
                )}
            </div>

            {/* Chart */}
           <div width="100%" style={{ maxWidth: 600, margin: '40px auto 0' }}>
             {withBirthdays.length > 0 && (
                <BirthdayChart byMonth={byMonth} />
            )}
           </div>
        </div>
    )
}