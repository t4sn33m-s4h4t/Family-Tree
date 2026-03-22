import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, getDoc,
  doc, updateDoc, deleteDoc
} from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export default function EditPage() {
  const { currentUser, isEditor, isAdmin } = useAuth()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [people, setPeople] = useState([])
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [accessRequested, setAccessRequested] = useState(false)

  const canEditDirectly = isEditor || isAdmin

  const emptyForm = {
    name: '', gender: '', birthDate: '',
    deathDate: '', phone: '', facebookId: '', photoURL: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [relations, setRelations] = useState({ parents: [], spouses: [], children: [] })

  useEffect(() => {
    if (canEditDirectly) {
      setAuthenticated(true)
      fetchPeople()
    }
  }, [canEditDirectly])

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    const snap = await getDoc(doc(db, 'config', 'settings'))
    if (snap.exists() && snap.data().editPassword === password) {
      setAuthenticated(true)
      fetchPeople()
    } else {
      setError('Incorrect password.')
    }
  }

  async function handleRequestAccess() {
    if (!currentUser) { setError('Please sign in first.'); return }
    await addDoc(collection(db, 'editorRequests'), {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || '',
      requestedAt: new Date().toISOString(),
      status: 'pending'
    })
    setAccessRequested(true)
  }

  async function fetchPeople() {
    const snap = await getDocs(collection(db, 'people'))
    setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  function handleSelectPerson(person) {
    setSelectedPerson(person)
    setForm({
      name: person.name || '',
      gender: person.gender || 'male',
      birthDate: person.birthDate || '',
      deathDate: person.deathDate || '',
      phone: person.phone || '',
      facebookId: person.facebookId || '',
      photoURL: person.photoURL || ''
    })
    setRelations({
      parents: [...(person.parents || [])],
      spouses: [...(person.spouses || [])],
      children: [...(person.children || [])]
    })
    setSuccessMsg('')
    setError('')
    setActiveTab('info')
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageUploading(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', 'family_tree_preset')
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: data }
    )
    const json = await res.json()
    setForm(f => ({ ...f, photoURL: json.secure_url }))
    setImageUploading(false)
  }

  function addRelation(type, id) {
    if (!id || relations[type].includes(id)) return
    setRelations(r => ({ ...r, [type]: [...r[type], id] }))
  }

  function removeRelation(type, id) {
    setRelations(r => ({ ...r, [type]: r[type].filter(rid => rid !== id) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const changes = {}
    Object.keys(form).forEach(key => {
      if (form[key] !== (selectedPerson[key] || '')) {
        changes[key] = form[key]
      }
    })

    const relChanged = (type) =>
      JSON.stringify([...(relations[type] || [])].sort()) !==
      JSON.stringify([...(selectedPerson[type] || [])].sort())

    if (relChanged('parents')) changes.parents = relations.parents
    if (relChanged('spouses')) changes.spouses = relations.spouses
    if (relChanged('children')) changes.children = relations.children

    if (Object.keys(changes).length === 0) {
      setError('No changes detected.')
      setSubmitting(false)
      return
    }

    if (canEditDirectly) {
      // Editor/admin — save directly
      await updateDoc(doc(db, 'people', selectedPerson.id), changes)
      setSuccessMsg('Changes saved successfully!')
    } else {
      // Regular user — submit for approval
      await addDoc(collection(db, 'pendingEdits'), {
        personId: selectedPerson.id,
        submittedBy: currentUser?.email || 'Editor',
        submittedAt: new Date().toISOString(),
        status: 'pending',
        changes
      })
      setSuccessMsg('Edit submitted! Waiting for admin approval.')
    }

    setSelectedPerson(null)
    setForm(emptyForm)
    setSubmitting(false)
    if (canEditDirectly) fetchPeople()
  }

  // Also allow editor to add/delete people
  async function handleAddPerson() {
    await addDoc(collection(db, 'people'), {
      ...emptyForm, gender: 'male',
      parents: [], spouses: [], children: []
    })
    fetchPeople()
  }

  async function handleDeletePerson(id) {
    if (!confirm('Delete this person?')) return
    await deleteDoc(doc(db, 'people', id))
    fetchPeople()
    if (selectedPerson?.id === id) setSelectedPerson(null)
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

  // Password gate for regular users
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="glass-strong" style={{ width: '100%', maxWidth: 400, padding: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 6px' }}>Edit Access</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>
            Enter the edit password or request editor access.
          </p>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
              color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="password"
              placeholder="Edit password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
            <button type="submit" style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: 'white', border: 'none', borderRadius: 8,
              padding: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Enter
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {!currentUser ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              Sign in to request editor access
            </p>
          ) : accessRequested ? (
            <div style={{
              background: 'rgba(134,239,172,0.12)', border: '1px solid rgba(134,239,172,0.25)',
              borderRadius: 8, padding: '12px 16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: '#86efac', margin: 0 }}>
                Request sent! Admin will review it.
              </p>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)', borderRadius: 8,
                padding: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Request Editor Access
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>
            {canEditDirectly ? 'Manage People' : 'Edit a Person'}
          </h1>
          {canEditDirectly && !selectedPerson && (
            <button
              onClick={() => {
                const name = prompt('Enter person name:')
                if (!name) return
                addDoc(collection(db, 'people'), {
                  name, gender: 'male', birthDate: '', deathDate: '',
                  phone: '', facebookId: '', photoURL: '',
                  parents: [], spouses: [], children: []
                }).then(fetchPeople)
              }}
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              + Add Person
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          {canEditDirectly
            ? 'Changes are saved directly.'
            : 'Changes go to admin for approval.'}
        </p>

        {successMsg && (
          <div style={{
            background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)',
            color: '#86efac', borderRadius: 8, padding: '10px 14px',
            fontSize: 13, marginBottom: 20,
          }}>
            {successMsg}
          </div>
        )}

        {!selectedPerson ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {people.map(person => (
              <div
                key={person.id}
                className="glass"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 12,
                }}
              >
                <button
                  onClick={() => handleSelectPerson(person)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left',
                  }}
                >
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
                      {person.gender} {person.birthDate && `· ${person.birthDate.split('-')[0]}`}
                    </p>
                  </div>
                </button>
                {canEditDirectly && (
                  <button
                    onClick={() => handleDeletePerson(person.id)}
                    style={{
                      background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                      color: '#f87171', borderRadius: 8, padding: '5px 12px',
                      fontSize: 12, cursor: 'pointer', marginLeft: 8,
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: 'white', fontWeight: 600, fontSize: 16, margin: 0 }}>
                Editing: {selectedPerson.name}
              </h2>
              <button
                onClick={() => setSelectedPerson(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)', borderRadius: 8,
                  padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                }}
              >
                ← Back
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button style={tabBtn('info')} onClick={() => setActiveTab('info')}>Info</button>
              <button style={tabBtn('relations')} onClick={() => setActiveTab('relations')}>Relations</button>
            </div>

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
                color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {activeTab === 'info' && (
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
                      {imageUploading ? 'Uploading...' : '+ Change Photo'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    {form.photoURL && (
                      <img src={form.photoURL} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', marginTop: 10, display: 'block' }} />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'relations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {['parents', 'spouses', 'children'].map(relType => (
                    <div key={relType}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
                        {relType}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        {relations[relType].map(rid => {
                          const rel = people.find(p => p.id === rid)
                          return rel ? (
                            <span key={rid} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              background: 'rgba(167,139,250,0.15)',
                              border: '1px solid rgba(167,139,250,0.3)',
                              borderRadius: 99, padding: '4px 10px 4px 4px',
                            }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: rel.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)',
                                color: rel.gender === 'female' ? '#f472b6' : '#60a5fa',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700,
                              }}>
                                {rel.name?.charAt(0)}
                              </div>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{rel.name}</span>
                              <button
                                type="button"
                                onClick={() => removeRelation(relType, rid)}
                                style={{
                                  background: 'none', border: 'none',
                                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                  fontSize: 14, padding: 0, lineHeight: 1,
                                }}
                              >×</button>
                            </span>
                          ) : null
                        })}
                      </div>
                      <select
                        value=""
                        onChange={e => { addRelation(relType, e.target.value); e.target.value = '' }}
                        style={inputStyle}
                      >
                        <option value="">+ Add {relType.slice(0, -1)}</option>
                        {people
                          .filter(p => p.id !== selectedPerson.id && !relations[relType].includes(p.id))
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 24,
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 24px', fontSize: 13, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Saving...' : canEditDirectly ? 'Save Changes' : 'Submit for Approval'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}