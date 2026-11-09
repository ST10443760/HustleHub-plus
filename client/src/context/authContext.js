import { createContext } from 'react';

// { user, loading, notice, clearNotice, login, register, logout,
//   changePassword, logoutAll } - provided by AuthProvider.
export const AuthContext = createContext(null);
