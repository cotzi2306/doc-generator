import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom'; // Agregamos Link

const Navbar: React.FC = () => {
  const { token, credits, isAdmin, logout } = useContext(AuthContext); // Extraemos isAdmin
  const navigate = useNavigate();

  if (!token) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm p-4 flex justify-between items-center mb-8">
      <Link to="/" className="text-xl font-bold text-gray-800 hover:text-blue-600">SaaS Generador</Link>
      
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link to="/admin" className="text-sm font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-md hover:bg-purple-200 transition">
            Panel Admin
          </Link>
        )}
        <span className="text-sm font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full">
          Créditos: {credits}
        </span>
        <button onClick={handleLogout} className="text-sm text-red-600 font-semibold hover:underline">
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;