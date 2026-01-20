
import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle, Smile } from 'lucide-react';
import { supabase } from '../backend/supabase';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Estados para validação de username
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  // Estado para sucesso no cadastro
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);

  // Debounce para verificação de username
  useEffect(() => {
      const checkUsername = async () => {
          if (!username || isLogin) return;
          if (username.length < 3) {
              setUsernameError('Mínimo 3 caracteres');
              setUsernameAvailable(false);
              return;
          }

          setIsCheckingUser(true);
          setUsernameError(null);

          try {
              const { data, error } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('username', username)
                  .single();

              if (data) {
                  setUsernameError('Nome de usuário já está em uso.');
                  setUsernameAvailable(false);
              } else {
                  setUsernameAvailable(true);
              }
          } catch (err) {
              // Se der erro (ex: não encontrou, que é o esperado para disponível), assumimos livre
              setUsernameAvailable(true);
          } finally {
              setIsCheckingUser(false);
          }
      };

      const timer = setTimeout(checkUsername, 500);
      return () => clearTimeout(timer);
  }, [username, isLogin]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
        } else {
            // Validações antes do cadastro
            if (!usernameAvailable) {
                throw new Error("Escolha um nome de usuário disponível.");
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,
                        full_name: fullName, 
                        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
                    }
                }
            });
            if (error) throw error;
            
            // Sucesso no cadastro
            setShowVerifyEmail(true);
        }
    } catch (err: any) {
        setError(err.message || 'Erro na autenticação.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
      setShowVerifyEmail(false);
      setIsLogin(true);
      setError(null);
      // Mantém email e password preenchidos para facilitar
  };

  if (showVerifyEmail) {
      return (
        <div className="w-full max-w-md bg-[#1e293b]/90 backdrop-blur-md p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden text-center">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-[#50c878]/20 rounded-full flex items-center justify-center border border-[#50c878]/50">
                    <Mail size={40} className="text-[#50c878]" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verifique seu E-mail</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Enviamos um link de confirmação para <strong>{email}</strong>.<br/>
                Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta e começar sua jornada.
            </p>
            <button 
                onClick={handleGoToLogin}
                className="w-full bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg"
            >
                Ir para Login
            </button>
        </div>
      );
  }

  return (
    <div className="w-full max-w-md bg-[#1e293b]/90 backdrop-blur-md p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#50c878]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

      <h2 className="text-2xl font-bold text-white mb-6 text-center relative z-10">
        {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
      </h2>

      <form onSubmit={handleAuthSubmit} className="space-y-4 relative z-10">
        {!isLogin && (
          <>
            <div className="relative group">
                <Smile className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#50c878] transition-colors" size={20} />
                <input 
                    type="text" 
                    placeholder="Nome de Exibição (ex: Luiz Correa)" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required={!isLogin} 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#50c878] transition-all" 
                />
            </div>
            <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#50c878] transition-colors" size={20} />
                <input 
                    type="text" 
                    placeholder="Nome de Usuário (único)" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
                    required={!isLogin} 
                    className={`w-full bg-slate-900/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none transition-all ${usernameError ? 'border-red-500' : usernameAvailable ? 'border-[#50c878]' : 'border-slate-700 focus:border-[#50c878]'}`} 
                />
                {isCheckingUser && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-[#50c878]" />
                    </div>
                )}
                {usernameAvailable && !isCheckingUser && username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#50c878]">
                        <CheckCircle size={16} />
                    </div>
                )}
            </div>
            {usernameError && <p className="text-xs text-red-400 pl-2 -mt-2">{usernameError}</p>}
          </>
        )}
        
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#50c878] transition-colors" size={20} />
          <input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#50c878] transition-all" />
        </div>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#50c878] transition-colors" size={20} />
          <input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#50c878] transition-all" />
        </div>

        {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-pulse">
                <AlertCircle size={16} />
                <span>{error}</span>
            </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (!isLogin && (!usernameAvailable || !fullName))}
          className="w-full bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 shadow-[0_0_15px_rgba(80,200,120,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              {isLogin ? 'Entrar' : 'Começar Jornada'}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center relative z-10">
        <p className="text-slate-400 text-sm">
          {isLogin ? 'Ainda não faz parte?' : 'Já possui conta?'}
          <button
            onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setUsername('');
                setFullName('');
            }}
            className="ml-2 text-[#50c878] font-bold hover:underline focus:outline-none"
          >
            {isLogin ? 'Crie uma conta' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
};
