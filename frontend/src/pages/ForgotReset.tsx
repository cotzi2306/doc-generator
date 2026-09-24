import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Recuperar Contraseña</h2>
        {message && <div className="mb-4 p-2 bg-blue-50 text-blue-700 text-xs rounded">{message}</div>}
        <form onSubmit={handleForgot} className="space-y-4">
          <input type="email" placeholder="Tu correo electrónico" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded text-sm" required />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold text-sm">Enviar enlace</button>
        </form>
        <p className="mt-4 text-xs text-center"><Link to="/login" className="text-blue-600 hover:underline">Regresar al login</Link></p>
      </div>
    </div>
  );
};

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    });
    if (res.ok) {
      alert('Contraseña actualizada. Inicia sesión.');
      navigate('/login');
    } else {
      setMessage('Token inválido o expirado.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Nueva Contraseña</h2>
        {message && <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded">{message}</div>}
        <form onSubmit={handleReset} className="space-y-4">
          <input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded text-sm" required />
          <button type="submit" className="w-full bg-green-600 text-white p-2 rounded font-bold text-sm">Restablecer</button>
        </form>
      </div>
    </div>
  );
};