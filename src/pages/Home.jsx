import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'

const NODE_W = 130
const NODE_H = 160
const H_GAP = 70
const V_GAP = 110

function buildTree(people) {
  const map = {}
  people.forEach(p => { map[p.id] = { ...p } })

  const connected = new Set()
  const roots = people.filter(p => {
    const parents = p.parents || []
    return parents.length === 0 || parents.every(pid => !map[pid])
  })

  function markConnected(id) {
    if (connected.has(id) || !map[id]) return
    connected.add(id)
    const p = map[id];
    (p.children || []).forEach(cid => markConnected(cid));
    (p.spouses || []).forEach(sid => markConnected(sid));
    (p.parents || []).forEach(pid => markConnected(pid));
  }
  roots.forEach(r => markConnected(r.id))

  const nodes = []
  const edges = []
  const spouseEdges = []
  const positioned = {}

  function getSubtreeWidth(id, visited = new Set()) {
    if (visited.has(id) || !map[id]) return NODE_W
    visited.add(id)
    const p = map[id]
    const spouses = (p.spouses || []).filter(sid => connected.has(sid))
    const spouseWidth = spouses.length * (NODE_W + H_GAP)
    const children = (p.children || []).filter(cid => connected.has(cid))
    if (children.length === 0) return NODE_W + spouseWidth
    const childWidths = children.map(cid => getSubtreeWidth(cid, new Set(visited)))
    return Math.max(NODE_W + spouseWidth, childWidths.reduce((a, b) => a + b + H_GAP, -H_GAP))
  }

  function positionNode(id, x, y, visited = new Set()) {
    if (visited.has(id) || !map[id] || !connected.has(id)) return
    visited.add(id)
    const p = map[id]
    positioned[id] = { x, y }
    nodes.push({ ...p, x, y })

    const spouses = (p.spouses || []).filter(sid => connected.has(sid) && !visited.has(sid))
    let spouseX = x + NODE_W + H_GAP
    spouses.forEach(sid => {
      if (!positioned[sid]) {
        positioned[sid] = { x: spouseX, y }
        nodes.push({ ...map[sid], x: spouseX, y })
        visited.add(sid)
        spouseEdges.push({ x1: x + NODE_W, y1: y + NODE_H / 2, x2: spouseX, y2: y + NODE_H / 2 })
        spouseX += NODE_W + H_GAP
      }
    })

    const children = (p.children || []).filter(cid => connected.has(cid) && !positioned[cid])
    if (children.length === 0) return

    const childWidths = children.map(cid => getSubtreeWidth(cid))
    const totalWidth = childWidths.reduce((a, b) => a + b + H_GAP, -H_GAP)
    const allSpouseIds = (p.spouses || []).filter(sid => positioned[sid])
    const rightmostX = allSpouseIds.length > 0 ? Math.max(...allSpouseIds.map(sid => positioned[sid].x)) : x
    const midX = (x + rightmostX + NODE_W) / 2
    let childX = midX - totalWidth / 2

    children.forEach((cid, i) => {
      const childCenterX = childX + childWidths[i] / 2 - NODE_W / 2
      const childY = y + NODE_H + V_GAP
      const childMidX = childCenterX + NODE_W / 2
      edges.push({ x1: midX, y1: y + NODE_H, x2: childMidX, y2: childY })
      positionNode(cid, childCenterX, childY, visited)
      childX += childWidths[i] + H_GAP
    })
  }

  let startX = 80
  roots.forEach(r => {
    if (!positioned[r.id]) {
      positionNode(r.id, startX, 80, new Set())
      startX += getSubtreeWidth(r.id) + H_GAP * 2
    }
  })

  return { nodes, edges, spouseEdges }
}

function PersonModal({ person, people, onClose }) {
  const age = person.birthDate
    ? Math.floor((new Date(person.deathDate || Date.now()) - new Date(person.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const getRelatives = (ids) => (ids || []).map(id => people.find(p => p.id === id)).filter(Boolean)
  const parents = getRelatives(person.parents)
  const spouses = getRelatives(person.spouses)
  const children = getRelatives(person.children)
  const isFemale = person.gender === 'female'

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(20,15,50,0.95)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20, width: '100%', maxWidth: 420,
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          background: isFemale
            ? 'linear-gradient(135deg, rgba(244,114,182,0.25), rgba(236,72,153,0.1))'
            : 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.1))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '28px 20px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 30, height: 30,
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>

          {person.photoURL ? (
            <img src={person.photoURL} style={{
              width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
              border: `2px solid ${isFemale ? 'rgba(244,114,182,0.5)' : 'rgba(96,165,250,0.5)'}`,
              marginBottom: 12,
            }} />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: isFemale ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)',
              border: `2px solid ${isFemale ? 'rgba(244,114,182,0.4)' : 'rgba(96,165,250,0.4)'}`,
              color: isFemale ? '#f472b6' : '#60a5fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, marginBottom: 12,
            }}>
              {person.name?.charAt(0)}
            </div>
          )}
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>{person.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '4px 0 0', textTransform: 'capitalize' }}>
            {person.gender}{person.deathDate ? ' · Deceased' : ''}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Dates */}
          {(person.birthDate || person.deathDate) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Born', val: person.birthDate },
                { label: 'Died', val: person.deathDate },
                { label: person.deathDate ? 'Age at death' : 'Age', val: age !== null ? `${age} yrs` : null },
              ].filter(x => x.val).map(({ label, val }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '8px 14px',
                }}>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Contact */}
          {(person.phone || person.facebookId) && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {person.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(134,239,172,0.12)',
                    border: '1px solid rgba(134,239,172,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#86efac', fontWeight: 700, fontSize: 12,
                  }}>P</div>
                  <div>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone</p>
                    <a href={`tel:${person.phone}`} style={{ fontSize: 13, color: '#60a5fa', fontWeight: 500, textDecoration: 'none' }}>{person.phone}</a>
                  </div>
                </div>
              )}
              {person.facebookId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(96,165,250,0.12)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#60a5fa', fontWeight: 700, fontSize: 12,
                  }}>F</div>
                  <div>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Facebook</p>
                    <a href={`https://facebook.com/${person.facebookId}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#60a5fa', fontWeight: 500, textDecoration: 'none' }}>{person.facebookId}</a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Relatives */}
          {[
            { label: 'Parents', list: parents },
            { label: 'Spouses', list: spouses },
            { label: 'Children', list: children },
          ].map(({ label, list }) => list.length > 0 && (
            <div key={label}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {list.map(rel => (
                  <div key={rel.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 99, padding: '4px 10px 4px 4px',
                  }}>
                    {rel.photoURL ? (
                      <img src={rel.photoURL} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: rel.gender === 'female' ? 'rgba(244,114,182,0.2)' : 'rgba(96,165,250,0.2)',
                        color: rel.gender === 'female' ? '#f472b6' : '#60a5fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700,
                      }}>{rel.name?.charAt(0)}</div>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{rel.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [people, setPeople] = useState([])
  const [tree, setTree] = useState({ nodes: [], edges: [], spouseEdges: [] })
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const svgRef = useRef(null)

  const isPanning = useRef(false)
  const didDrag = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const offset = useRef({ x: 0, y: 0 })
  const scaleVal = useRef(1)
  const gRef = useRef(null)

  function applyTransform(ox, oy, sc) {
    if (gRef.current) {
      gRef.current.setAttribute('transform', `translate(${ox},${oy}) scale(${sc})`)
    }
  }

 useEffect(() => {
  async function fetchPeople() {
  const snap = await getDocs(collection(db, 'people'))
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  setPeople(data)
  const treeData = buildTree(data)
  setTree(treeData)
  setLoading(false)

  // Center after render
  setTimeout(() => {
    if (treeData.nodes.length > 0) {
      const firstNode = treeData.nodes.find(n => {
        const person = data.find(p => p.id === n.id)
        return !person?.parents?.length ||
          person.parents.every(pid => !data.find(p => p.id === pid))
      }) || treeData.nodes[0]

      const screenCenterX = window.innerWidth / 2
      const initialX = screenCenterX - firstNode.x - NODE_W / 2  - 100
      const initialY = 40

      offset.current = { x: initialX, y: initialY }
      if (gRef.current) {
        gRef.current.setAttribute('transform', `translate(${initialX},${initialY}) scale(1)`)
      }
    }
  }, 50)
}
  fetchPeople()
}, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(scaleVal.current * delta, 0.2), 3)
      scaleVal.current = newScale
      applyTransform(offset.current.x, offset.current.y, newScale)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [loading])

  function onMouseDown(e) {
    isPanning.current = true
    didDrag.current = false
    startPos.current = { x: e.clientX - offset.current.x, y: e.clientY - offset.current.y }
  }

  function onMouseMove(e) {
    if (!isPanning.current) return
    const x = e.clientX - startPos.current.x
    const y = e.clientY - startPos.current.y
    if (Math.abs(x - offset.current.x) > 3 || Math.abs(y - offset.current.y) > 3) didDrag.current = true
    offset.current = { x, y }
    applyTransform(x, y, scaleVal.current)
  }

  function onMouseUp() {
    isPanning.current = false
    setTimeout(() => { didDrag.current = false }, 10)
  }

  function onTouchStart(e) {
    const t = e.touches[0]
    isPanning.current = true
    didDrag.current = false
    startPos.current = { x: t.clientX - offset.current.x, y: t.clientY - offset.current.y }
  }

  function onTouchMove(e) {
    if (!isPanning.current) return
    const t = e.touches[0]
    const x = t.clientX - startPos.current.x
    const y = t.clientY - startPos.current.y
    didDrag.current = true
    offset.current = { x, y }
    applyTransform(x, y, scaleVal.current)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading...</p>
    </div>
  )

  if (people.length === 0) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No family members yet.</p>
    </div>
  )

  const { nodes, edges, spouseEdges } = tree

  return (
    <>
      <svg
        ref={svgRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { isPanning.current = false; setTimeout(() => { didDrag.current = false }, 10) }}
        style={{
          width: '100vw',
          height: 'calc(100vh - 64px)',
          cursor: 'grab',
          display: 'block',
        }}
      >
        <g ref={gRef} transform="translate(0,0) scale(1)">

          {/* Edges */}
          {edges.map((e, i) => (
            <path
              key={`e${i}`}
              d={`M${e.x1},${e.y1} C${e.x1},${e.y1 + V_GAP * 0.6} ${e.x2},${e.y2 - V_GAP * 0.6} ${e.x2},${e.y2}`}
              stroke="rgba(167,139,250,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"
            />
          ))}

          {/* Spouse edges */}
          {spouseEdges.map((e, i) => (
            <line
              key={`se${i}`}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="rgba(244,114,182,0.4)" strokeWidth="1.5" strokeDasharray="5,4"
            />
          ))}

          {/* Nodes as foreignObject inside SVG — pan/zoom works everywhere */}
          {nodes.map(person => {
            const isFemale = person.gender === 'female'
            return (
              <foreignObject
                key={person.id}
                x={person.x} y={person.y}
                width={NODE_W} height={NODE_H}
                style={{ overflow: 'visible' }}
              >
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  onMouseDown={onMouseDown}
                  onMouseUp={(e) => {
                    onMouseUp()
                    if (!didDrag.current) setSelectedPerson(person)
                  }}
                  style={{
                    width: NODE_W,
                    background: isFemale ? 'rgba(244,114,182,0.08)' : 'rgba(96,165,250,0.08)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid ${isFemale ? 'rgba(244,114,182,0.2)' : 'rgba(96,165,250,0.2)'}`,
                    borderRadius: 16,
                    padding: '12px 8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {person.photoURL ? (
                    <img
                      src={person.photoURL} draggable={false}
                      style={{
                        width: 54, height: 54, borderRadius: '50%',
                        objectFit: 'cover', marginBottom: 8,
                        border: `2px solid ${isFemale ? 'rgba(244,114,182,0.4)' : 'rgba(96,165,250,0.4)'}`,
                        pointerEvents: 'none',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 54, height: 54, borderRadius: '50%',
                      background: isFemale ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)',
                      border: `2px solid ${isFemale ? 'rgba(244,114,182,0.35)' : 'rgba(96,165,250,0.35)'}`,
                      color: isFemale ? '#f472b6' : '#60a5fa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700, marginBottom: 8,
                    }}>
                      {person.name?.charAt(0)}
                    </div>
                  )}
                 <p style={{
  fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.85)',
  textAlign: 'center', lineHeight: 1.3,
  margin: 0,
  width: '100%',
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  wordBreak: 'break-word',
}}>
  {person.name}
</p>
                  {person.birthDate && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>
                      {person.birthDate.split('-')[0]}
                      {person.deathDate ? ` — ${person.deathDate.split('-')[0]}` : ''}
                    </p>
                  )}
                  {person.deathDate && (
                    <span style={{
                      marginTop: 4, fontSize: 9,
                      background: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.3)',
                      padding: '2px 7px', borderRadius: 99,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      Deceased
                    </span>
                  )}
                </div>
              </foreignObject>
            )
          })}
        </g>
      </svg>

      {/* Hint */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 10,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: '6px 12px',
        fontSize: 11, color: 'rgba(255,255,255,0.25)',
        pointerEvents: 'none',
      }}>
        Scroll to zoom · Drag to pan
      </div>

      {/* Stats */}
      <div style={{
        position: 'fixed', bottom: 20, left: 20, zIndex: 10,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '10px 16px',
        pointerEvents: 'none',
      }}>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Members</p>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { color: '#60a5fa', count: people.filter(p => p.gender === 'male').length, label: 'Male' },
            { color: '#f472b6', count: people.filter(p => p.gender === 'female').length, label: 'Female' },
            { color: '#a78bfa', count: people.length, label: 'Total' },
          ].map(({ color, count, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 13, color: 'white', fontWeight: 700 }}>{count}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedPerson && (
        <PersonModal
          person={selectedPerson}
          people={people}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </>
  )
}