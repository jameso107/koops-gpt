import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

function Auth({ onAuthChange }) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setError('Supabase is not configured. Please check your environment variables.')
      return
    }

    // Check active sessions
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        return
      }
      setUser(session?.user ?? null)
      onAuthChange(session?.user ?? null)
    }).catch((error) => {
      console.error('Error in getSession:', error)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      onAuthChange(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [onAuthChange])

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error.message)
      setError(error.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      setError('Check your email for the confirmation link!')
    } catch (error) {
      console.error('Error signing up:', error.message)
      setError(error.message || 'Failed to sign up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error.message)
      alert('Error signing out: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="auth-container">
        <div className="auth-user-info">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'User')}`}
            alt="User avatar"
            className="auth-avatar"
          />
          <div className="auth-user-details">
            <div className="auth-user-name">{user.email}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="auth-signout-button"
        >
          {loading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src="/koops.png" alt="Koops Logo" className="auth-logo" />
        <h1>Welcome to KoopsGPT</h1>
        <p>{isSignUp ? 'Create an account' : 'Sign in to continue'}</p>
        
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>
          
          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              required
              disabled={loading}
              className="auth-input"
              minLength={isSignUp ? 6 : undefined}
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-button auth-button-primary"
          >
            {loading 
              ? (isSignUp ? 'Creating account...' : 'Signing in...') 
              : (isSignUp ? 'Sign Up' : 'Sign In')
            }
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="auth-link-button"
            disabled={loading}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Auth
