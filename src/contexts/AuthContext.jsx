import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isEditor, setIsEditor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const snap = await getDoc(doc(db, 'config', 'settings'))
        if (snap.exists()) {
          const data = snap.data()
          setIsAdmin(data.adminUID === user.uid)
          setIsEditor((data.editorUIDs || []).includes(user.uid))
        }
      } else {
        setIsAdmin(false)
        setIsEditor(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, isEditor, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}