import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function MarriageList() {
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

  const currentYear = new Date().getFullYear()

  function getAge(birthDate) {
    const [year, month, day] = birthDate.split('-').map(Number)
    const today = new Date()
    let age = today.getFullYear() - year
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--
    return age
  }

  const eligible = people.filter(p =>
    p.birthDate &&
    !p.deathDate &&
    (!p.spouses || p.spouses.length === 0) &&
    getAge(p.birthDate) >= 18
  ).map(p => ({ ...p, age: getAge(p.birthDate) }))
    .sort((a, b) => b.age - a.age)

  const males = eligible.filter(p => p.gender === 'male')
  const females = eligible.filter(p => p.gender === 'female')

  function PersonRow({ person, index }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: index === 0
          ? 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(124,58,237,0.06))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${index === 0 ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, padding: '12px 16px',
      }}>
        {/* Rank */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: index === 0
            ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
            : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: index === 0 ? 'white' : 'rgba(255,255,255,0.3)',
        }}>
          {index + 1}
        </div>

        {/* Avatar */}
        {person.photoURL ? (
          <img src={person.photoURL} style={{
            width: 44, height: 44, borderRadius: '50%',
            objectFit: 'cover', flexShrink: 0,
            border: `2px solid ${person.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'}`,
          }} />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: person.gender === 'female' ? 'rgba(244,114,182,0.12)' : 'rgba(96,165,250,0.12)',
            border: `2px solid ${person.gender === 'female' ? 'rgba(244,114,182,0.25)' : 'rgba(96,165,250,0.25)'}`,
            color: person.gender === 'female' ? '#f472b6' : '#60a5fa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700,
          }}>
            {person.name?.charAt(0)}
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: 'white', fontWeight: 600, fontSize: 14,
            margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {person.name}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>
            Born {person.birthDate}
          </p>
        </div>

        {/* Age badge */}
        <div style={{
          flexShrink: 0, textAlign: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '6px 14px',
        }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>
            {person.age}
          </p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            yrs
          </p>
        </div>
      </div>
    )
  }

  function Section({ title, list, color, lineColor }) {
    return (
      <div style={{ marginBottom: 32 }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ height: 1, flex: 1, background: lineColor }} />
          <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {title} · {list.length}
          </span>
          <div style={{ height: 1, flex: 1, background: lineColor }} />
        </div>

        {list.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>
              No eligible {title.toLowerCase()} found.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((person, i) => (
              <PersonRow key={person.id} person={person} index={i} />
            ))}
          </div>
        )}
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>
            Marriage Queue
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '5px 0 0' }}>
            Unmarried members above 18  
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 32 }}>
          {[
            { label: 'Total', value: eligible.length, color: '#a78bfa' },
            { label: 'Males', value: males.length, color: '#60a5fa' },
            { label: 'Females', value: females.length, color: '#f472b6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>

        {eligible.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>The queue is empty — everyone is taken or under 18! 🎉
            </p>
          </div>
        ) : (
          <>
            <Section
              title="Males"
              list={males}
              color="#60a5fa"
              lineColor="rgba(96,165,250,0.2)"
            />
            <Section
              title="Females"
              list={females}
              color="#f472b6"
              lineColor="rgba(244,114,182,0.2)"
            />
          </>
        )}
      </div>
    </div>
  )
}