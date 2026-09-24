import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

interface UserData {
  id: number;
  name: string;
  email: string;
  credits: number;
  total_generated: number;
  is_admin: boolean;
}

const AdminDashboard: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState<UserData[]>([]);
  const [editCredits, setEditCredits] = useState<{ [key: number]: number }>({});
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = () => {
    fetch('http://localhost:8000/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(() => setError('Error al cargar clientes'));
  };

  useEffect(() => { fetchUsers(); }, [token]);

  // Función para guardar los nuevos créditos
  const handleUpdateCredits = async (userId: number) => {
    const newCreditValue = editCredits[userId];
    if (newCreditValue === undefined) return;

    const res = await fetch(`http://localhost:8000/admin/users/${userId}/credits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ credits: newCreditValue })
    });

    if (res.ok) {
      alert('Créditos actualizados con éxito');
      fetchUsers(); // Recargamos la tabla
    } else {
      alert('Error al actualizar créditos');
    }
  };

  // NUEVA: Función para eliminar cuenta
  const handleDeleteUser = async (userId: number, userEmail: string) => {
    // Pedimos confirmación al administrador antes de borrar
    const isConfirmed = window.confirm(`¿Estás completamente seguro de que deseas eliminar la cuenta de ${userEmail}?\n\nEsta acción NO se puede deshacer.`);
    
    if (!isConfirmed) return;

    const res = await fetch(`http://localhost:8000/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      alert('Usuario eliminado correctamente.');
      fetchUsers(); // Recargamos la tabla para que desaparezca
    } else {
      const errorData = await res.json();
      alert(`Error al eliminar: ${errorData.detail}`);
    }
  };

  if (error) return <div className="text-center text-red-500 mt-10 font-bold">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Panel de Administración de Clientes</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Nombre</th>
              <th className="p-3 border-b">Correo</th>
              <th className="p-3 border-b text-center">Docs Generados</th>
              <th className="p-3 border-b text-center">Créditos</th>
              <th className="p-3 border-b text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 border-b text-gray-500 font-mono text-xs">{u.id}</td>
                <td className="p-3 border-b font-medium">{u.name} {u.is_admin && <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">ADMIN</span>}</td>
                <td className="p-3 border-b text-gray-600">{u.email}</td>
                <td className="p-3 border-b text-center font-semibold text-gray-700">{u.total_generated}</td>

                <td className="p-3 border-b text-center">
                  <div className="flex justify-center gap-2 items-center">
                    <input 
                      type="number" 
                      defaultValue={u.credits}
                      onChange={e => setEditCredits({ ...editCredits, [u.id]: parseInt(e.target.value) || 0 })}
                      className="w-16 p-1 border rounded text-center text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={() => handleUpdateCredits(u.id)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-bold transition"
                    >
                      Guardar
                    </button>
                  </div>
                </td>

                {/* Columna: Acciones (Eliminar) */}
                <td className="p-3 border-b text-center">
                  {!u.is_admin ? (
                    <button 
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs hover:bg-red-600 hover:text-white font-bold transition"
                    >
                      Eliminar
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No aplicable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;