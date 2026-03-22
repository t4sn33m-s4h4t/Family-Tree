import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Birthdays from './pages/Birthdays'
import Home from './pages/Home'
import Login from './pages/Login'
import EditPage from './pages/EditPage'
import PersonProfile from './pages/PersonProfile'
import AdminPage from './pages/AdminPage' 
import MarriageList from './pages/MarriageList'

import Profile from './pages/Profile'
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/marriage" element={<MarriageList />} /> 
          <Route path="/birthdays" element={<Birthdays />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit" element={<EditPage />} />
          <Route path="/person/:id" element={<PersonProfile />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}