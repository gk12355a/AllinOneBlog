import React, { createContext, useContext } from 'react';
import { useApp } from './AppContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, loginUser, logoutUser } = useApp();

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login: loginUser,
    logout: logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback to useApp if outside AuthProvider
    const { user, loginUser, logoutUser } = useApp();
    return {
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      login: loginUser,
      logout: logoutUser,
    };
  }
  return context;
};

export default AuthContext;
