import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  is_super_admin: boolean;
  last_login: string;
}

interface AdminContextType {
  admin: AdminUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('validate_admin_session', {
        p_session_token: sessionToken
      });

      if (error || !data?.success) {
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      setAdmin(data.admin as AdminUser);
    } catch (error) {
      console.error('Erro ao verificar sessão admin:', error);
      localStorage.removeItem('admin_session_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      console.log('Tentando fazer login admin com:', username);
      
      const { data, error } = await supabase.rpc('authenticate_admin', {
        p_username: username,
        p_password: password
      });

      console.log('Resposta do login admin:', data);
      
      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.message || 'Credenciais administrativas inválidas');
      }

      // Salvar token e definir admin
      localStorage.setItem('admin_session_token', data.session_token);
      setAdmin(data.admin as AdminUser);

      toast.success('Login administrativo realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no login admin:', error);
      throw new Error(error.message || 'Erro ao fazer login administrativo');
    }
  };

  const signOut = async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      if (sessionToken && admin) {
        // Remover sessão do banco
        await supabase
          .from('admin_sessions')
          .delete()
          .eq('session_token', sessionToken);

        // Log da ação
        await createAdminLog(admin.id, 'LOGOUT', null, null, null, null, await getClientIP());
      }

      localStorage.removeItem('admin_session_token');
      setAdmin(null);
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout admin:', error);
    }
  };

  const generateSessionToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const createAdminLog = async (
    adminId: string,
    action: string,
    tableName?: string,
    recordId?: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string
  ) => {
    try {
      await supabase.rpc('create_admin_log', {
        p_admin_id: adminId,
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId,
        p_old_data: oldData,
        p_new_data: newData,
        p_ip_address: ipAddress
      });
    } catch (error) {
      console.error('Erro ao criar log admin:', error);
    }
  };

  return (
    <AdminContext.Provider value={{
      admin,
      loading,
      signIn,
      signOut,
      isAuthenticated: !!admin
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}