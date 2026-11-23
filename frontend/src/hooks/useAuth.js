import { useApp } from '../contexts/AppContext';

export const useAuth = () => {
  const { user, loginUser, logoutUser } = useApp();
  return {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login: loginUser,
    logout: logoutUser,
  };
};

export default useAuth;
