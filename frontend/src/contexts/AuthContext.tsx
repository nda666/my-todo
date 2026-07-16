import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useMutation } from '@apollo/client';

import {
  clearToken,
  getToken,
  graphql,
  saveUser,
  setToken,
} from '../lib/auth';
import {
  LOGIN as LOGIN_MUTATION,
  ME,
} from '../lib/queries';

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginMutation] = useMutation(LOGIN_MUTATION);

  // Fetch current user from API using saved token
  const fetchMe = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setMe(null)
      setLoading(false)
      return
    }

    try {
      const data = await graphql(ME)
      if (data.me) {
        setMe(data.me)
        saveUser(data.me)
      } else {
        // Token valid tapi user tidak ditemukan
        setMe(null)
        clearToken()
      }
    } catch {
      // Token expired / invalid
      setMe(null)
      clearToken()
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount, verify token & fetch user
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = useCallback(async (username, password) => {
    const { data } = await loginMutation({ variables: { username, password } });
    setToken(data.login.token)
    saveUser(data.login.user)
    setMe(data.login.user)
    return data.login.user
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setMe(null)
  }, [])

  const refreshMe = useCallback(async () => {
    await fetchMe()
  }, [fetchMe])


  const isLoggedIn = !!me

  return (
    <AuthContext.Provider value={{ me, isLoggedIn, login, logout, loading, refreshMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
