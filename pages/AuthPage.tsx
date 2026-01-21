import React from "react";
import { Feather } from "lucide-react";
import { AuthForm } from "../components/AuthForm";

const AuthPage: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      {/* Background Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#50c878]/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFC300]/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in-down">
        <div className="bg-slate-800/50 p-4 rounded-full mb-4 border border-slate-700 shadow-xl backdrop-blur-sm">
          <Feather className="text-[#50c878]" size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          CATARSE
        </h1>
        <p className="text-slate-400 text-lg font-light italic text-center max-w-sm">
          "Sua jornada de leveza começa no agora"
        </p>
      </div>

      <div className="w-full flex justify-center relative z-10 animate-fade-in-up">
        <AuthForm />
      </div>

      <footer className="absolute bottom-6 text-slate-600 text-xs text-center">
        © 2024 Catarse Social. Respire fundo.
      </footer>
    </div>
  );
};

export default AuthPage;
