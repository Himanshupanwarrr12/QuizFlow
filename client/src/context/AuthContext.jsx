import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authService.getMe();
        if (res.success) {
          setUser(res.data.user);
        }
      } catch (err) {
        console.error("Not authenticated");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (armyNumber, password) => {
    const res = await authService.login({ armyNumber, password });
    if (res.success) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
