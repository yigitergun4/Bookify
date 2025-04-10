import React from "react";
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {FirebaseError} from "firebase/app"
import firestore from '@react-native-firebase/firestore';
import { RelativePathString, useRouter } from 'expo-router';
import { appConfig } from '@/config/app.config';

type AuthContextType = {
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    session?: FirebaseAuthTypes.User | null;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    error: string | null;
};

const AuthContext = React.createContext<AuthContextType>({
    signIn: async () => {},
    signOut: async () => {},
    signUp: async () => {},
    session: null,
    isLoading: false,
    setIsLoading: () => {},
    error: null,
});

// This hook can be used to access the user info.
export function useSession() {
    const value = React.useContext(AuthContext);
    if (process.env.NODE_ENV !== "production") {
        if (!value) {
            throw new Error("useSession must be wrapped in a <SessionProvider />");
        }
    }
    return value;
}

export function SessionProvider(props: React.PropsWithChildren) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [user, setUser] = React.useState<FirebaseAuthTypes.User | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const router = useRouter();
    const [authFlag, setAuthFlag] = React.useState(false);

    const authFlagRef = React.useRef(false);

    React.useEffect(() => {
        // auth().signOut();
        console.log("AuthContext mounted");
        const unsubscribe = auth().onAuthStateChanged(async (user) => {
            if (user && !authFlagRef.current) {
                authFlagRef.current = true; // Burada state yerine useRef kullanılıyor
                console.log("Auth State Changed:", user?.uid);
                setUser(user);
                router.replace("/signup"); // Önce loading screen'e yönlendir
            }else if(!user){
                router.replace('///signup');
            }
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            const response = await auth().signInWithEmailAndPassword(email, password);
            router.replace('//signup'); // Login sonrası loading screen'e yönlendir
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            setError(null);

            // Önce kullanıcıyı Authentication'da oluştur
            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Sonra Firestore'da users collection'ında yeni bir döküman oluştur
            await firestore()
                .collection('Users')
                .doc(user.uid)  // Kullanıcı UID'si ile döküman oluştur
                .set({
                    email: user.email,
                    username: "",
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: firestore.FieldValue.serverTimestamp(),
                    displayName: user.displayName || null,
                    photoURL: user.photoURL || null,
                    emailVerified: user.emailVerified,
                    onboardingCompleted: false,
                    goals: [],
                    preferences: {},
                    isActive: true, // Kullanıcı aktif durumda
                    role: 'user', // Varsayılan kullanıcı rolü
                    notifications: {
                        enabled: true,
                        token: null
                    }
                }, { merge: true }); // merge: true ile varolan dökümanı güncelle

            router.replace('//signup'); // Kayıt sonrası loading screen'e yönlendir
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setIsLoading(true);
            setError(null);
            await auth().signOut();
        } catch (e) {
            const err = e as FirebaseError
            setError(err.message);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                signIn: signIn,
                signOut,
                signUp: signUp,
                session: user,
                isLoading,
                setIsLoading,
                error,
            }}
        >
            {props.children}
        </AuthContext.Provider>
    );
}