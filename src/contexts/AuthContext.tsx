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
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('penny-count-user');
        setLoginError('This account has been deleted. Please contact support if this is an error.');
        setIsLoading(false);
        return;
      }

      // Check if user account is inactive (soft deleted)
      if (data.is_active === false) {
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

      if (authError) {
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

      if (error) {
                throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error: any) {
            let errorMessage = error.message || 'Invalid credentials.';
      // Map technical Supabase errors to user-friendly messages
      if (errorMessage.includes('Invalid login credentials')) errorMessage = 'Incorrect email/phone or password. Please try again.';
      else if (errorMessage.includes('Email not confirmed')) errorMessage = 'Please verify your email before logging in.';
      else if (errorMessage.includes('Too many requests')) errorMessage = 'Too many login attempts. Please wait a few minutes.';
      else if (errorMessage.includes('User not found')) errorMessage = 'No account found. Please sign up first.';
      else if (errorMessage.includes('phone number')) errorMessage = 'No account linked to this phone number.';
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