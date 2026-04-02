import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import MisViajes from './pages/MisViajes'
import NuevoViaje from './pages/NuevoViaje'
import DetalleViaje from './pages/DetalleViaje'
import Usuarios from './pages/Usuarios'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/viajes"
            element={<ProtectedRoute><MisViajes /></ProtectedRoute>}
          />
          <Route
            path="/viajes/nuevo"
            element={<ProtectedRoute perm="perm_crear_viaje"><NuevoViaje /></ProtectedRoute>}
          />
          <Route
            path="/viajes/:id"
            element={<ProtectedRoute><DetalleViaje /></ProtectedRoute>}
          />
          <Route
            path="/usuarios"
            element={<ProtectedRoute perm="perm_crear_usuarios"><Usuarios /></ProtectedRoute>}
          />

          <Route path="*" element={<Navigate to="/viajes" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
