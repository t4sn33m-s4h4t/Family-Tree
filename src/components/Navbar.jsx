import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

export default function Navbar() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef(null)

  async function handleSignOut() {
    await signOut(auth)
    navigate('/')
    setMenuOpen(false)
    setMobileOpen(false)
  }

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [location])

  const navLinks = [
    { to: '/', label: 'Tree' },
    { to: '/edit', label: 'Edit' },
    { to: '/birthdays', label: 'Birthdays' },
    { to: '/marriage', label: '💍 Queue' },
  ]

  const linkStyle = (to) => ({
    color: location.pathname === to ? 'white' : 'rgba(255,255,255,0.6)',
    fontSize: 13, textDecoration: 'none',
    padding: '6px 14px', borderRadius: 8,
    transition: 'all 0.2s',
    background: location.pathname === to ? 'rgba(167,139,250,0.15)' : 'transparent',
    border: location.pathname === to ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent',
    fontWeight: location.pathname === to ? 600 : 400,
  })

  return (
    <>
      <nav style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>Family Tree</p>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          className="desktop-nav"
        >
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={linkStyle(to)}
              onMouseEnter={e => {
                if (location.pathname !== to) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={e => {
                if (location.pathname !== to) e.currentTarget.style.background = 'transparent'
              }}
            >
              {label}
            </Link>
          ))}

          {currentUser ? (
            <div ref={menuRef} style={{ position: 'relative', marginLeft: 8 }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 99, padding: '5px 14px 5px 5px',
                  cursor: 'pointer', color: 'white',
                }}
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white',
                  }}>
                    {(currentUser.displayName || currentUser.email)?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>▼</span>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0,
                  background: 'rgba(30,20,60,0.97)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  overflow: 'hidden', zIndex: 100,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Signed in as</p>
                    <p style={{ fontSize: 13, color: 'white', fontWeight: 600, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.email}
                    </p>
                  </div>
                  <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} style={{
                    width: '100%', padding: '10px 16px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.8)', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    👤 Profile Settings
                  </button>
                  <button onClick={handleSignOut} style={{
                    width: '100%', padding: '10px 16px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#f87171', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: 'white', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', padding: '8px 18px',
              borderRadius: 99, marginLeft: 8,
              boxShadow: '0 4px 15px rgba(167,139,250,0.35)',
            }}>
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '7px 10px',
            cursor: 'pointer', display: 'none',
            flexDirection: 'column', gap: 4,
          }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 20, height: 2, borderRadius: 2,
              background: 'rgba(255,255,255,0.7)',
              transform: mobileOpen
                ? i === 0 ? 'rotate(45deg) translate(4px, 4px)'
                  : i === 2 ? 'rotate(-45deg) translate(4px, -4px)'
                  : 'scaleX(0)'
                : 'none',
              transition: 'all 0.2s',
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 49,
          background: 'rgba(15,12,41,0.98)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              color: location.pathname === to ? 'white' : 'rgba(255,255,255,0.6)',
              fontSize: 15, textDecoration: 'none',
              padding: '12px 16px', borderRadius: 10,
              background: location.pathname === to ? 'rgba(167,139,250,0.15)' : 'transparent',
              border: `1px solid ${location.pathname === to ? 'rgba(167,139,250,0.25)' : 'transparent'}`,
              fontWeight: location.pathname === to ? 600 : 400,
              display: 'block',
            }}>
              {label}
            </Link>
          ))}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 12 }}>
            {currentUser ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', marginBottom: 6 }}>
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white',
                    }}>
                      {(currentUser.displayName || currentUser.email)?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0 }}>
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => { navigate('/profile'); setMobileOpen(false) }} style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)', fontSize: 14, borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  👤 Profile Settings
                </button>
                <button onClick={handleSignOut} style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#f87171', fontSize: 14, borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  🚪 Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" style={{
                display: 'block', textAlign: 'center',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                color: 'white', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', padding: '12px',
                borderRadius: 10,
              }}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </>
  )
}