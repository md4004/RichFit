import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, User } from './firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isCoach: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isCoach: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check for profile in Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // If no profile exists, we don't auto-create it here anymore
          // to avoid overwriting data during induction.
          // We only set a minimal profile if it's absolutely necessary for the UI.
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: (firebaseUser.email?.toLowerCase() === 'michelsaloumi@gmail.com' || 
                   firebaseUser.email?.toLowerCase() === 'michelsaloumi0@gmail.com' ||
                   firebaseUser.email?.toLowerCase() === 'richfit@gmail.com') ? 'admin' : 'user'
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isCoach = profile?.role === 'coach';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isCoach }}>
      {children}
    </AuthContext.Provider>
  );
};
