import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, getDoc
} from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = 'family_tree_preset'
function EditorRequests() {
  const [requests, setRequests] = useState([])
  const [editors, setEditors] = useState([]) // {uid, email, displayName}
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchRequests()
    fetchEditors()
  }, [])

  async function fetchRequests() {
    const snap = await getDocs(collection(db, 'editorRequests'))
    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function fetchEditors() {
    const snap = await getDoc(doc(db, 'config', 'settings'))
    if (!snap.exists()) return
    const editorUIDs = snap.data().editorUIDs || []

    // Get approved requests to match uid → email
    const reqSnap = await getDocs(collection(db, 'approvedEditors'))
    const approved = reqSnap.docs.map(d => d.data())

    // Build editors list with email info
    const editorList = editorUIDs.map(uid => {
      const found = approved.find(a => a.uid === uid)
      return { uid, email: found?.email || uid, displayName: found?.displayName || '' }
    })
    setEditors(editorList)
  }

  async function handleApprove(request) {
    // Save to approvedEditors collection for future reference
    await addDoc(collection(db, 'approvedEditors'), {
      uid: request.uid,
      email: request.email,
      displayName: request.displayName || '',
    })

    const snap = await getDoc(doc(db, 'config', 'settings'))
    const editorUIDs = snap.data().editorUIDs || []
    const newUIDs = [...editorUIDs, request.uid]
    await updateDoc(doc(db, 'config', 'settings'), { editorUIDs: newUIDs })
    await deleteDoc(doc(db, 'editorRequests', request.id))
    fetchRequests()
    fetchEditors()
    setMsg(`${request.email} is now an editor!`)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleDecline(id) {
    await deleteDoc(doc(db, 'editorRequests', id))
    fetchRequests()
  }

  async function handleRevokeEditor(uid) {
    if (!confirm('Revoke editor access for this user?')) return
    const snap = await getDoc(doc(db, 'config', 'settings'))
    const newUIDs = (snap.data().editorUIDs || []).filter(id => id !== uid)
    await updateDoc(doc(db, 'config', 'settings'), { editorUIDs: newUIDs })
    fetchEditors()
    setMsg('Editor access revoked.')
    setTimeout(() => setMsg(''), 3000)
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && <p style={{ fontSize: 12, color: '#86efac', margin: 0 }}>{msg}</p>}

      {/* Current editors */}
      {editors.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
            Current Editors
          </p>
          {editors.map(editor => (
            <div key={editor.uid} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 6,
            }}>
              <div>
                <p style={{ fontSize: 13, color: 'white', fontWeight: 600, margin: 0 }}>
                  {editor.displayName || editor.email}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                  {editor.email}
                </p>
              </div>
              <button
                onClick={() => handleRevokeEditor(editor.uid)}
                style={{
                  background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                  color: '#f87171', borderRadius: 6, padding: '4px 12px',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending requests */}
      {pending.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          No pending editor requests.
        </p>
      ) : (
        pending.map(req => (
          <div key={req.id} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0 }}>
                {req.displayName || 'Unknown'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>
                {req.email}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleApprove(req)}
                style={{
                  background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)',
                  color: '#86efac', borderRadius: 8, padding: '5px 12px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Approve
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                style={{
                  background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                  color: '#f87171', borderRadius: 8, padding: '5px 12px',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
} 
export default function AdminPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState([])
  const [pendingEdits, setPendingEdits] = useState([])
  const [activeTab, setActiveTab] = useState('people')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEditPassword, setNewEditPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [managingRelations, setManagingRelations] = useState(null)
  const [deleteAllMsg, setDeleteAllMsg] = useState('')
  const [editingPendingId, setEditingPendingId] = useState(null)
  const [editingChanges, setEditingChanges] = useState({})

  const emptyForm = {
    name: '', gender: 'male', birthDate: '',
    deathDate: '', phone: '', facebookId: '', photoURL: ''
  }
  const [form, setForm] = useState(emptyForm)

  const glassCard = {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '9px 12px',
    fontSize: 13, color: 'white', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: 11, color: 'rgba(255,255,255,0.45)',
    display: 'block', marginBottom: 5,
  }

  const tabBtn = (tab) => ({
    padding: '7px 18px', borderRadius: 8, fontSize: 13,
    fontWeight: 500, cursor: 'pointer', border: 'none',
    background: activeTab === tab
      ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
      : 'rgba(255,255,255,0.07)',
    color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.5)',
  })

  useEffect(() => {
    async function checkAdmin() {
      if (!currentUser) { navigate('/login'); return }
      const snap = await getDoc(doc(db, 'config', 'settings'))
      if (snap.exists() && snap.data().adminUID === currentUser.uid) {
        setIsAdmin(true)
        fetchPeople()
        fetchPendingEdits()
      } else {
        navigate('/')
      }
      setLoading(false)
    }
    checkAdmin()
  }, [currentUser])

  async function fetchPeople() {
    const snap = await getDocs(collection(db, 'people'))
    setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function fetchPendingEdits() {
    const snap = await getDocs(collection(db, 'pendingEdits'))
    setPendingEdits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageUploading(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: data }
    )
    const json = await res.json()
    setForm(f => ({ ...f, photoURL: json.secure_url }))
    setImageUploading(false)
  }

  async function handleAddPerson(e) {
    e.preventDefault()
    await addDoc(collection(db, 'people'), {
      ...form, parents: [], spouses: [], children: []
    })
    setForm(emptyForm)
    setShowAddForm(false)
    fetchPeople()
  }

  async function handleDeletePerson(id) {
    if (!confirm('Delete this person?')) return
    await deleteDoc(doc(db, 'people', id))
    fetchPeople()
  }

  async function handleAddRelation(person, relType, targetId) {
    const updated = [...(person[relType] || []), targetId]
    await updateDoc(doc(db, 'people', person.id), { [relType]: updated })
    fetchPeople()
  }

  async function handleRemoveRelation(person, relType, targetId) {
    const updated = (person[relType] || []).filter(id => id !== targetId)
    await updateDoc(doc(db, 'people', person.id), { [relType]: updated })
    fetchPeople()
  }

  async function handleApprove(edit) {
    const changes = editingPendingId === edit.id ? editingChanges : edit.changes
    await updateDoc(doc(db, 'people', edit.personId), changes)
    await deleteDoc(doc(db, 'pendingEdits', edit.id))
    setEditingPendingId(null)
    setEditingChanges({})
    fetchPendingEdits()
    fetchPeople()
  }

  async function handleDecline(editId) {
    if (!confirm('Decline and delete this edit request?')) return
    await deleteDoc(doc(db, 'pendingEdits', editId))
    fetchPendingEdits()
  }

  function startEditingPending(edit) {
    setEditingPendingId(edit.id)
    setEditingChanges({ ...edit.changes })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    await updateDoc(doc(db, 'config', 'settings'), { editPassword: newEditPassword })
    setPasswordMsg('Password updated!')
    setNewEditPassword('')
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  async function handleDeleteAll() {
    const confirmed = confirm('Are you sure? This will delete ALL people permanently.')
    if (!confirmed) return
    const secondConfirm = confirm('Last warning — delete everything?')
    if (!secondConfirm) return
    const snap = await getDocs(collection(db, 'people'))
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'people', d.id))))
    const editSnap = await getDocs(collection(db, 'pendingEdits'))
    await Promise.all(editSnap.docs.map(d => deleteDoc(doc(db, 'pendingEdits', d.id))))
    setPeople([])
    setPendingEdits([])
    setDeleteAllMsg('All people deleted successfully.')
    setTimeout(() => setDeleteAllMsg(''), 4000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading...</p>
    </div>
  )
  if (!isAdmin) return null

  const pendingCount = pendingEdits.filter(e => e.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 24 }}>Admin Panel</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['people', 'pending', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtn(tab)}>
              {tab === 'pending'
                ? `Pending (${pendingCount})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── PEOPLE TAB ── */}
        {activeTab === 'people' && (
          <div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                marginBottom: 16,
                background: showAddForm ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showAddForm ? 'Cancel' : '+ Add Person'}
            </button>

            {showAddForm && (
              <form onSubmit={handleAddPerson} style={{ ...glassCard, padding: 24, marginBottom: 20 }}>
                <h2 style={{ color: 'white', fontWeight: 600, fontSize: 15, margin: '0 0 18px' }}>New Person</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender *</label>
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} style={inputStyle}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Birth Date</label>
                    <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Death Date</label>
                    <input type="date" value={form.deathDate} onChange={e => setForm(f => ({ ...f, deathDate: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Facebook ID</label>
                    <input value={form.facebookId} onChange={e => setForm(f => ({ ...f, facebookId: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Photo</label>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                      color: '#a78bfa', borderRadius: 8, padding: '7px 14px',
                      fontSize: 12, cursor: 'pointer', fontWeight: 500,
                    }}>
                      {imageUploading ? 'Uploading...' : '+ Choose Photo'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    {form.photoURL && (
                      <img src={form.photoURL} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', marginTop: 10, display: 'block' }} />
                    )}
                  </div>
                </div>
                <button type="submit" style={{
                  marginTop: 18,
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: 8,
                  padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Add Person
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {people.map(person => (
                <div key={person.id} style={{ ...glassCard, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {person.photoURL ? (
                        <img src={person.photoURL} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: person.gender === 'female' ? 'rgba(244,114,182,0.2)' : 'rgba(96,165,250,0.2)',
                          color: person.gender === 'female' ? '#f472b6' : '#60a5fa',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 16,
                        }}>
                          {person.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>{person.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, textTransform: 'capitalize' }}>
                          {person.gender} {person.birthDate && `· ${person.birthDate}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setManagingRelations(managingRelations === person.id ? null : person.id)}
                        style={{
                          background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                          color: '#a78bfa', borderRadius: 8, padding: '5px 12px',
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Relations
                      </button>
                      <button
                        onClick={() => handleDeletePerson(person.id)}
                        style={{
                          background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                          color: '#f87171', borderRadius: 8, padding: '5px 12px',
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {managingRelations === person.id && (
                    <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {['parents', 'spouses', 'children'].map(relType => (
                        <div key={relType}>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                            {relType}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {(person[relType] || []).map(relId => {
                              const rel = people.find(p => p.id === relId)
                              return rel ? (
                                <span key={relId} style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  background: 'rgba(167,139,250,0.12)',
                                  border: '1px solid rgba(167,139,250,0.25)',
                                  borderRadius: 99, padding: '3px 8px 3px 3px',
                                }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: rel.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)',
                                    color: rel.gender === 'female' ? '#f472b6' : '#60a5fa',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 700,
                                  }}>
                                    {rel.name?.charAt(0)}
                                  </div>
                                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{rel.name}</span>
                                  <button
                                    onClick={() => handleRemoveRelation(person, relType, relId)}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13, padding: 0 }}
                                  >×</button>
                                </span>
                              ) : null
                            })}
                          </div>
                          <select
                            onChange={e => { if (e.target.value) { handleAddRelation(person, relType, e.target.value); e.target.value = '' } }}
                            style={inputStyle}
                          >
                            <option value="">+ Add {relType.slice(0, -1)}</option>
                            {people
                              .filter(p => p.id !== person.id && !(person[relType] || []).includes(p.id))
                              .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                            }
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PENDING TAB ── */}
        {activeTab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pendingEdits.filter(e => e.status === 'pending').length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No pending edits.</p>
            )}
            {pendingEdits.filter(e => e.status === 'pending').map(edit => {
              const person = people.find(p => p.id === edit.personId)
              const isEditing = editingPendingId === edit.id
              const currentChanges = isEditing ? editingChanges : edit.changes

              return (
                <div key={edit.id} style={{ ...glassCard, padding: 20 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>
                        Edit request for:{' '}
                        <span style={{ color: '#a78bfa' }}>{person?.name || edit.personId}</span>
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '3px 0 0' }}>
                        By: {edit.submittedBy} · {new Date(edit.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => startEditingPending(edit)}
                        style={{
                          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
                          color: '#fbbf24', borderRadius: 8, padding: '5px 12px',
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Changes */}
                  <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: 14, marginBottom: 14,
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {Object.entries(currentChanges).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 80,
                        }}>
                          {key}
                        </span>
                        {isEditing && !Array.isArray(val) ? (
                          <input
                            value={editingChanges[key] || ''}
                            onChange={e => setEditingChanges(c => ({ ...c, [key]: e.target.value }))}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                        ) : (
                          <span style={{ fontSize: 13, color: 'white' }}>
                            {Array.isArray(val)
                              ? val.map(id => people.find(p => p.id === id)?.name || id).join(', ') || '—'
                              : val || '—'
                            }
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleApprove(edit)}
                      style={{
                        background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)',
                        color: '#86efac', borderRadius: 8, padding: '7px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => { setEditingPendingId(null); setEditingChanges({}) }}
                        style={{
                          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '7px 16px',
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDecline(edit.id)}
                      style={{
                        background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                        color: '#f87171', borderRadius: 8, padding: '7px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>

            <div style={{ ...glassCard, padding: 24 }}>
              <h2 style={{ color: 'white', fontWeight: 600, fontSize: 15, margin: '0 0 18px' }}>
                Change Edit Password
              </h2>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  required type="text"
                  placeholder="New password"
                  value={newEditPassword}
                  onChange={e => setNewEditPassword(e.target.value)}
                  style={inputStyle}
                />
                <button type="submit" style={{
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: 8,
                  padding: '9px 20px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', alignSelf: 'flex-start',
                }}>
                  Update Password
                </button>
                {passwordMsg && <p style={{ fontSize: 12, color: '#86efac', margin: 0 }}>{passwordMsg}</p>}
              </form>
            </div>

{/* Editor Access */}
<div style={{ ...glassCard, padding: 24 }}>
  <h2 style={{ color: 'white', fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>
    Editor Access Requests
  </h2>
  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 16px' }}>
    Approve users to give them full editor access.
  </p>
  <EditorRequests people={people} />
</div>


            <div style={{ ...glassCard, padding: 24, border: '1px solid rgba(248,113,113,0.2)' }}>
              <h2 style={{ color: '#f87171', fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>
                Danger Zone
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 16px' }}>
                Permanently deletes every person and all pending edits. Cannot be undone.
              </p>
              <button
                onClick={handleDeleteAll}
                style={{
                  background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
                  color: '#f87171', borderRadius: 8, padding: '9px 20px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Delete All People
              </button>
              {deleteAllMsg && <p style={{ fontSize: 12, color: '#f87171', margin: '10px 0 0' }}>{deleteAllMsg}</p>}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}