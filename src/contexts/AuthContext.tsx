import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  signup: (user: { name: string; email: string; phone: string; password: string; role: string }) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loginError: string | null;
  signupError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('penny-count-user');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // User record not found - account was deleted
        console.error('User account not found - may have been deleted');
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('penny-count-user');
        setLoginError('This account has been deleted. Please contact support if this is an error.');
        setIsLoading(false);
        return;
      }

      // Check if user account is inactive (soft deleted)
      if (data.is_active === false) {
        console.error('User account is inactive');
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('penny-count-user');
        setLoginError('This account has been deactivated. Please contact support if this is an error.');
        setIsLoading(false);
        return;
      }

      const userProfile: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role as 'owner' | 'co-owner' | 'agent',
        photo: data.photo,
        isActive: data.is_active,
        assignedLines: data.assigned_lines || [],
        approvalStatus: data.approval_status,
        createdAt: new Date(data.created_at)
      };
      setUser(userProfile);
      localStorage.setItem('penny-count-user', JSON.stringify(userProfile));
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('penny-count-user');
      setLoginError('Failed to load user profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: { name: string; email: string; phone: string; password: string; role: string }) => {
    // Validate password length
    if (userData.password.length < 8) {
      setSignupError('Password must be at least 8 characters long.');
      return false;
    }

    // Validate phone number - must be exactly 10 digits
    const cleanedPhone = userData.phone.replace(/[^0-9]/g, '');
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      setSignupError('Please enter a valid 10-digit phone number.');
      return false;
    }

    setSignupError(null);
    setIsLoading(true);

    try {

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingEmail) {
        setSignupError('This email is already registered. Please use a different email or login.');
        setIsLoading(false);
        return false;
      }

      // Check if phone already exists
      const { data: existingPhone } = await supabase
        .from('users')
        .select('phone')
        .eq('phone', cleanedPhone)
        .maybeSingle();

      if (existingPhone) {
        setSignupError('This phone number is already registered. Please use a different number.');
        setIsLoading(false);
        return false;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: cleanedPhone,
            role: userData.role
          }
        }
      });

      console.log('Signup response:', {
        hasUser: !!authData?.user,
        error: authError?.message
      });

      if (authError) {
        console.error('Signup error:', authError);
        throw authError;
      }

      if (authData.user) {

        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            name: userData.name,
            email: userData.email,
            phone: cleanedPhone,
            role: userData.role,
            is_active: true,
            assigned_lines: []
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);

          // Handle specific duplicate errors
          if (profileError.message.includes('users_phone_key')) {
            setSignupError('This phone number is already registered.');
          } else if (profileError.message.includes('users_email_key')) {
            setSignupError('This email is already registered.');
          } else {
            setSignupError(profileError.message);
          }

          setIsLoading(false);
          return false;
        }
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (err: any) {
      console.error('Signup caught error:', err);
      let msg = err?.message || 'Sign up failed.';

      // Handle duplicate errors
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        msg = 'Email or phone number already registered.';
      } else if (msg.includes('users_phone_key')) {
        msg = 'This phone number is already registered.';
      } else if (msg.includes('users_email_key')) {
        msg = 'This email is already registered.';
      } else if (msg.includes('users_phone_check')) {
        msg = 'Please enter a valid 10-digit phone number.';
      }

      setSignupError(msg);
      setIsLoading(false);
      return false;
    }
  };

  const login = async (emailOrPhone: string, password: string): Promise<boolean> => {
    setLoginError(null);
    setIsLoading(true);

    try {

      let email = emailOrPhone;

      // Check if input is a phone number (10 digits)
      const cleanedInput = emailOrPhone.replace(/[^0-9]/g, '');
      if (cleanedInput.length === 10) {

        // Use the secure database function to look up email by phone
        const { data, error: lookupError } = await supabase.rpc('get_email_by_phone', {
          phone_number: cleanedInput
        });

        if (lookupError) {
          console.error('Phone lookup error:', lookupError);
          throw new Error('Invalid phone number or credentials.');
        }

        if (!data) {
          throw new Error('No account found with this phone number.');
        }

        email = data;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      console.log('Login response:', {
        hasUser: !!data?.user,
        error: error?.message
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('Login caught error:', error);
      const errorMessage = error.message || 'Invalid credentials.';
      setLoginError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser, loginError, signupError }}>
      {children}
    </AuthContext.Provider>
  );
};