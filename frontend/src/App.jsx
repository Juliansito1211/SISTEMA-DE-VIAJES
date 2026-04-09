import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import MisViajes from './pages/MisViajes'
import NuevoViaje from './pages/NuevoViaje'
import ProgramarViaje from './pages/ProgramarViaje'
import DetalleViaje from './pages/DetalleViaje'
import Usuarios from './pages/Usuarios'
import Gruas from './pages/Gruas'
import DetalleGrua, { NuevaGrua } from './pages/DetalleGrua'

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
            path="/viajes/programar"
            element={<ProtectedRoute perm="perm_crear_viaje"><ProgramarViaje /></ProtectedRoute>}
          />
          <Route
            path="/viajes/:id"
            element={<ProtectedRoute><DetalleViaje /></ProtectedRoute>}
          />
          <Route
            path="/usuarios"
            element={<ProtectedRoute perm="perm_crear_usuarios"><Usuarios /></ProtectedRoute>}
          />
          <Route
            path="/gruas"
            element={<ProtectedRoute><Gruas /></ProtectedRoute>}
          />
          <Route
            path="/gruas/nueva"
            element={<ProtectedRoute perm="perm_gestionar_gruas"><NuevaGrua /></ProtectedRoute>}
          />
          <Route
            path="/gruas/:id"
            element={<ProtectedRoute><DetalleGrua /></ProtectedRoute>}
          />

          <Route path="*" element={<Navigate to="/viajes" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
