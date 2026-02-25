import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AddCard from './pages/AddCard'
import CardDetails from './pages/CardDetails'
import AddItem from './pages/AddItem'
import Settings from './pages/Settings'
import ManageAuthors from './pages/ManageAuthors'
import ManageCardOrder from './pages/settings/ManageCardOrder'

function App() {
  const { isAuthenticated, verifyAuth } = useAuthStore()

  useEffect(() => {
    verifyAuth()
  }, [verifyAuth])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/cards/new"
          element={isAuthenticated ? <AddCard /> : <Navigate to="/login" />}
        />
        <Route
          path="/cards/:cardId"
          element={isAuthenticated ? <CardDetails /> : <Navigate to="/login" />}
        />
        <Route
          path="/cards/:cardId/edit"
          element={isAuthenticated ? <AddCard /> : <Navigate to="/login" />}
        />
        <Route
          path="/cards/:cardId/items/new"
          element={isAuthenticated ? <AddItem /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings/manage-authors"
          element={isAuthenticated ? <ManageAuthors /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings/card-order"
          element={isAuthenticated ? <ManageCardOrder /> : <Navigate to="/login" />}
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Catch all - 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
