import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { Tournaments } from "./pages/Tournaments";
import { ClubRegister } from "./pages/ClubRegister";
import { TournamentAdmin } from "./pages/TournamentAdmin";
import { TournamentLive } from "./pages/TournamentLive";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/t/:tournamentId/register" element={<ClubRegister />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournaments"
          element={
            <ProtectedRoute>
              <Tournaments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/t/:tournamentId/admin"
          element={
            <ProtectedRoute>
              <TournamentAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/t/:tournamentId/live"
          element={
            <ProtectedRoute>
              <TournamentLive />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
