import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../firebase'
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = 'family_tree_preset'

export default function Profile() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

  if (!currentUser) { navigate('/login'); return null }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoUploading(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: data }
    )
    const json = await res.json()
    await updateProfile(auth.currentUser, { photoURL: json.secure_url })
    setPhotoUploading(false)
    setNameMsg('Photo updated!')
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function handleUpdateName(e) {
    e.preventDefault()
    await updateProfile(auth.currentUser, { displayName })
    setNameMsg('Name updated!')
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordMsg('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPassword)
      setPasswordMsg('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg(''), 3000)
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect.')
      } else if (err.code === 'auth/too-many-requests') {
        setPasswordError('Too many attempts. Try again later.')
      } else {
        setPasswordError(err.message)
      }
    }
  }

  const isGoogleUser = currentUser.providerData?.[0]?.providerId === 'google.com'

  return (
    <div style={{ minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 14px',
            fontSize: 13, cursor: 'pointer', marginBottom: 24,
          }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 24 }}>
          Profile Settings
        </h1>

        {/* Avatar + Name */}
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 20 }}>
            Display Info
          </h2>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} style={{
                width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
                border: '3px solid rgba(167,139,250,0.5)',
              }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'white',
              }}>
                {(currentUser.displayName || currentUser.email)?.charAt(0).toUpperCase()}
              </div>
            )}
            <label style={{
              background: 'rgba(167,139,250,0.15)',
              border: '1px solid rgba(167,139,250,0.3)',
              color: '#a78bfa', borderRadius: 8,
              padding: '7px 14px', fontSize: 12,
              cursor: 'pointer', fontWeight: 500,
            }}>
              {photoUploading ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Display name */}
          <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                Display Name
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={{ border:  '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 6, width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input value={currentUser.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '9px 20px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', alignSelf: 'flex-start',
              }}
            >
              Save Name
            </button>
            {nameMsg && <p style={{ fontSize: 12, color: '#86efac', margin: 0 }}>{nameMsg}</p>}
          </form>
        </div>

        {/* Change Password */}
        {!isGoogleUser ? (
          <div className="glass" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 20 }}>
              Change Password
            </h2>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              {passwordError && (
                <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{passwordError}</p>
              )}
              {passwordMsg && (
                <p style={{ fontSize: 12, color: '#86efac', margin: 0 }}>{passwordMsg}</p>
              )}
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: 8,
                  padding: '9px 20px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', alignSelf: 'flex-start',
                }}
              >
                Update Password
              </button>
            </form>
          </div>
        ) : (
          <div className="glass" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              You signed in with Google — password change is managed by Google.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}