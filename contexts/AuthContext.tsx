import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// 1. Context tipi tanımı
type AuthContextType = {
    user: FirebaseAuthTypes.User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    loading: boolean;
    error: string | null;
};

// 2. Varsayılan değer
const AuthContext = createContext<AuthContextType>({
    user: null,
    signIn: async () => {},
    signOut: async () => {},
    signUp: async () => {},
    loading: false,
    error: null,
});

// 3. Hook
export const useAuth = () => useContext(AuthContext);

// 4. Provider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Firebase kullanıcı dinleyicisi
    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(currentUser => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe; // bileşen unmount olduğunda listener'ı kaldır
    }, []);

    // Giriş
    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);
            await auth().signInWithEmailAndPassword(email, password);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Kayıt
    const signUp = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);
            await auth().createUserWithEmailAndPassword(email, password);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Çıkış
    const signOut = async () => {
        try {
            setLoading(true);
            await auth().signOut();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};
