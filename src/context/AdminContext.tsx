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

      const { data, error } = await supabase
        .from('admin_sessions')
        .select(`
          admin_id,
          expires_at,
          admin_users!inner(
            id,
            username,
            full_name,
            email,
            is_super_admin,
            last_login
          )
        `)
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      setAdmin(data.admin_users as AdminUser);
    } catch (error) {
      console.error('Erro ao verificar sessão admin:', error);
      localStorage.removeItem('admin_session_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    // Verificação especial para credenciais do administrador
    if (username === 'paufergunza@gmail.com' && password === 'admin2025') {
      try {
        // Buscar usuário admin
        const { data: adminUser, error: userError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', 'paufergunza@gmail.com')
          .single();

        if (userError || !adminUser) {
          throw new Error('Usuário administrador não encontrado');
        }

        // Criar sessão
        const sessionToken = generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 8); // 8 horas

        const { error: sessionError } = await supabase
          .from('admin_sessions')
          .insert({
            admin_id: adminUser.id,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
          });

        if (sessionError) throw sessionError;

        // Atualizar último login
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminUser.id);

        // Salvar token e definir admin
        localStorage.setItem('admin_session_token', sessionToken);
        setAdmin({
          id: adminUser.id,
          username: adminUser.username,
          full_name: adminUser.full_name,
          email: adminUser.email,
          is_super_admin: adminUser.is_super_admin,
          last_login: adminUser.last_login
        });

        // Log da ação
        await createAdminLog(adminUser.id, 'LOGIN', null, null, null, null, await getClientIP());

        toast.success('Login administrativo realizado com sucesso!');
      } catch (error: any) {
        console.error('Erro no login admin:', error);
        throw new Error(error.message || 'Erro ao fazer login administrativo');
      }
    } else {
      throw new Error('Credenciais administrativas inválidas');
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