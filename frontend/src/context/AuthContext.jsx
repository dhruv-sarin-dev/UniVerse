import { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import API_URL from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Presence WebSocket
  useEffect(() => {
    if (!user) {
      setTimeout(() => setOnlineUsers([]), 0);
      return;
    }
    
    let ws;
    let reconnectTimer;
    
    const connect = () => {
      const wsBase = API_URL.replace(/^http/, 'ws');
      ws = new WebSocket(`${wsBase}/ws/presence/${user.uid}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync') {
            setOnlineUsers(data.online_users || []);
          } else if (data.type === 'presence_update') {
            if (data.status === 'online') {
              setOnlineUsers(prev => prev.includes(data.uid) ? prev : [...prev, data.uid]);
            } else {
              setOnlineUsers(prev => prev.filter(uid => uid !== data.uid));
            }
          }
        } catch (err) {
          console.error("Presence WS parsing error", err);
        }
      };

      ws.onclose = () => {
        // Auto-reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null; // Prevent reconnect loop on unmount
        ws.close();
      }
    };
  }, [user]);

  // Initialize from storage for persistence
  useEffect(() => {
    if (!auth) {
      const saved = localStorage.getItem('universe_user');
      setTimeout(() => {
        if (saved) setUser(JSON.parse(saved));
        setLoading(false);
      }, 0);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let profileData = {};
        let hasProfile = false;
        try {
          const res = await fetch(`${API_URL}/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            hasProfile = data.has_profile === true;
            if (hasProfile) {
              profileData = {
                skills: data.skills || [],
                branch: data.branch || '',
                year: data.year || '',
                bio: data.bio || '',
                github: data.github || '',
                display_name: data.display_name || currentUser.displayName,
              };
            }
          }
        } catch (err) {
          console.warn("Could not fetch user profile status from API", err);
        }

        setUser({
          uid: currentUser.uid,
          display_name: profileData.display_name || currentUser.displayName,
          email: currentUser.email,
          photo_url: currentUser.photoURL,
          avatar: (profileData.display_name || currentUser.displayName)?.charAt(0) || 'U',
          has_profile: hasProfile,
          ...profileData
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    if (!auth) {
      const mockUser = {
        uid: 'user_' + Math.floor(Math.random() * 10000),
        display_name: 'Demo Student',
        email: 'demo@university.edu',
        branch: 'Computer Science',
        avatar: 'D'
      };
      setUser(mockUser);
      localStorage.setItem('universe_user', JSON.stringify(mockUser));
      return;
    }

    try {
      // Force Google to show the account selector every time for testing
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Firebase Login Error: " + error.message);
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      localStorage.removeItem('universe_user');
      return;
    }
    await firebaseSignOut(auth);
  };

  const updateUser = (partialUpdate) => {
    setUser(prev => {
      const newUser = {
        ...prev,
        ...partialUpdate,
        avatar: (partialUpdate.display_name || prev.display_name)?.charAt(0) || prev.avatar
      };
      if (!auth) {
        localStorage.setItem('universe_user', JSON.stringify(newUser));
      }
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, onlineUsers }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
