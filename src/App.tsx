/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calculator, 
  Trash2, 
  Copy, 
  Eye, 
  Download, 
  Maximize2, 
  ArrowRightLeft, 
  Grid3X3,
  Info,
  Layers,
  Palette,
  LayoutGrid,
  LogOut,
  UserPlus,
  LogIn,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  calcularMelhorDistribuicao, 
  CHAPA_LARGURA, 
  CHAPA_ALTURA, 
  DIVISOR_FINAL, 
  Resultado,
  Bloco
} from './calculator';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type Tool = 'montagem' | 'fator' | 'terceira';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>('montagem');
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (isSigningUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "Ocorreu um erro na autenticação.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "E-mail ou senha inválidos.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Este e-mail já está em uso.";
      } else if (error.code === 'auth/weak-password') {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Formato de e-mail inválido.";
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // States for Cálculo NJG
  const [larguraNJG, setLarguraNJG] = useState<string>('');
  const [alturaNJG, setAlturaNJG] = useState<string>('');
  
  // States for Fator DTF
  const [larguraDTF, setLarguraDTF] = useState<string>('');
  const [alturaDTF, setAlturaDTF] = useState<string>('');
  
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [resultado285, setResultado285] = useState<Resultado | null>(null);

  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef285 = useRef<HTMLCanvasElement>(null);

  // States for Fator Etiqueta Bordada
  const [fundo, setFundo] = useState<string>('');
  const [cores, setCores] = useState<string[]>(Array(11).fill(''));
  const [fatorResultado, setFatorResultado] = useState<string>('');

  const parsedNJG = useMemo(() => {
    const valL = parseFloat(larguraNJG.replace(',', '.'));
    const valA = parseFloat(alturaNJG.replace(',', '.'));
    return { w: isNaN(valL) ? 0 : valL, h: isNaN(valA) ? 0 : valA };
  }, [larguraNJG, alturaNJG]);

  const parsedDTF = useMemo(() => {
    const valL = parseFloat(larguraDTF.replace(',', '.'));
    const valA = parseFloat(alturaDTF.replace(',', '.'));
    return { w: isNaN(valL) ? 0 : valL, h: isNaN(valA) ? 0 : valA };
  }, [larguraDTF, alturaDTF]);

  // Cálculo NJG logic
  useEffect(() => {
    if (parsedNJG.w > 0 && parsedNJG.h > 0) {
      const res = calcularMelhorDistribuicao(parsedNJG.w, parsedNJG.h, CHAPA_LARGURA, CHAPA_ALTURA);
      setResultado(res);
    } else {
      setResultado(null);
    }
  }, [parsedNJG]);

  // Fator DTF logic
  useEffect(() => {
    if (parsedDTF.w > 0 && parsedDTF.h > 0) {
      const res = calcularMelhorDistribuicao(parsedDTF.w, parsedDTF.h, 285, 1000);
      setResultado285(res);
    } else {
      setResultado285(null);
    }
  }, [parsedDTF]);

  // Fator Etiqueta Logic
  useEffect(() => {
    const valFundo = parseFloat(fundo.replace(',', '.'));
    if (!isNaN(valFundo) && valFundo > 0) {
      let somaTotal = valFundo;
      cores.forEach(c => {
        const valCor = parseFloat(c.replace(',', '.'));
        if (!isNaN(valCor)) somaTotal += valCor;
      });
      const fator = somaTotal / valFundo;
      setFatorResultado(fator.toFixed(5).replace('.', ','));
    } else {
      setFatorResultado('');
    }
  }, [fundo, cores]);

  const desenharPreview = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    blocos: Bloco[], 
    isDownload = false, 
    logoImg?: HTMLImageElement,
    cW = CHAPA_LARGURA,
    cH = CHAPA_ALTURA,
    divisor = DIVISOR_FINAL,
    itemW = 0,
    itemH = 0
  ) => {
    if (isDownload) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    
    const margemSuperior = isDownload ? 120 : 40;
    const margemLateral = isDownload ? 10 : 40;
    const escalaX = (width - 2 * margemLateral) / cW;
    const escalaY = (height - (isDownload ? 160 : margemSuperior) - margemLateral) / cH;
    const escala = Math.min(escalaX, escalaY);

    const larguraDesenho = cW * escala;
    const alturaDesenho = cH * escala;
    const xIni = (width - larguraDesenho) / 2;
    const yIni = isDownload ? 100 : (height - alturaDesenho) / 2;

    if (isDownload) {
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(0, 0, width, 90);
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 24px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`RELATÓRIO DE MONTAGEM (${cW}x${cH})`, 30, 40);
      ctx.font = '14px Inter';
      ctx.fillStyle = '#52525b';
      const infoText = `Item: ${itemW} x ${itemH} mm | Total Peças: ${blocos.length} ${divisor > 1 ? `| Resultado /${divisor}: ${Math.floor(blocos.length / divisor)}` : ''}`;
      ctx.fillText(infoText, 30, 65);
      ctx.font = '14px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, width - 30, 40);
      ctx.fillText(`Chapa: ${cW} x ${cH} mm`, width - 30, 65);

      if (logoImg) {
        const logoTargetW = 120;
        const logoTargetH = (logoImg.height / logoImg.width) * logoTargetW;
        const logoX = (width - logoTargetW) / 2;
        const logoY = height - logoTargetH - 15;
        ctx.drawImage(logoImg, logoX, logoY, logoTargetW, logoTargetH);
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 2;
    ctx.fillRect(xIni, yIni, larguraDesenho, alturaDesenho);
    ctx.strokeRect(xIni, yIni, larguraDesenho, alturaDesenho);

    blocos.forEach((bloco, i) => {
      const x1 = xIni + bloco.x * escala;
      const y1 = yIni + bloco.y * escala;
      const bw = bloco.w * escala;
      const bh = bloco.h * escala;
      ctx.fillStyle = bloco.rot ? '#ef444415' : '#3b82f615';
      ctx.strokeStyle = bloco.rot ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 1;
      ctx.fillRect(x1, y1, bw, bh);
      ctx.strokeRect(x1, y1, bw, bh);
      if (bw > 25 && bh > 18) {
        ctx.fillStyle = '#71717a';
        ctx.font = '600 10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x1 + bw / 2, y1 + bh / 2);
      }
    });

    if (!isDownload) {
      ctx.fillStyle = '#a1a1aa';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${cW}x${cH}mm`, width / 2, yIni - 10);
    }
  };

  useEffect(() => {
    const canvas = activeTool === 'montagem' ? canvasRef.current : canvasRef285.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'montagem' && resultado) {
      desenharPreview(ctx, canvas.width, canvas.height, resultado.blocos, false, undefined, CHAPA_LARGURA, CHAPA_ALTURA, DIVISOR_FINAL, parsedNJG.w, parsedNJG.h);
    } else if (activeTool === 'terceira' && resultado285) {
      desenharPreview(ctx, canvas.width, canvas.height, resultado285.blocos, false, undefined, 285, 1000, 1, parsedDTF.w, parsedDTF.h);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [resultado, resultado285, activeTool, parsedNJG, parsedDTF]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated Background Items */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-slate-200/50 rounded-full blur-3xl opacity-50" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white p-10 md:p-14 relative z-10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-[280px] h-auto flex items-center justify-center mb-10 overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/1omT0tNA02xW5lBSE1sGEzuxHRl3_Amj_" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-slate-400 text-sm font-black uppercase tracking-[0.2em] text-center">SISTEMA DE CÁLCULO</p>
          </div>

          <form className="space-y-6" onSubmit={handleAuth}>
            {authError && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold text-center">
                {authError}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Segurança</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={authLoading}
                className="w-full h-14 bg-[#0F172A] hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {authLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isSigningUp ? 'Criar Minha Conta' : 'Acessar Portal'}
                    {isSigningUp ? <UserPlus size={16} className="text-blue-500" /> : <LogIn size={16} className="text-blue-500" />}
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSigningUp(!isSigningUp);
                  setAuthError(null);
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
              >
                {isSigningUp ? 'Já tenho uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
              </button>
            </div>
          </form>

          <div className="mt-12 text-center">
             <div className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mb-6">Ambiente Seguro e Monitorado</div>
             <div className="flex items-center justify-center gap-4">
               <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group cursor-default">
                  <Info size={14} className="group-hover:text-blue-500 transition-colors" />
               </div>
               <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group cursor-default">
                  <Maximize2 size={14} className="group-hover:text-blue-500 transition-colors" />
               </div>
               <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group cursor-default">
                  <Layers size={14} className="group-hover:text-blue-500 transition-colors" />
               </div>
             </div>
          </div>
        </motion.div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center w-full">
          © 2026 - TODOS OS DIREITOS RESERVADOS
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    let textToCopy = '';
    if (activeTool === 'montagem' && resultado) {
      textToCopy = Math.floor(resultado.quantidade / DIVISOR_FINAL).toString();
    } else if (activeTool === 'fator' && fatorResultado) {
      textToCopy = fatorResultado;
    } else if (activeTool === 'terceira' && resultado285) {
      textToCopy = resultado285.quantidade.toString();
    }
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clear = () => {
    setLarguraNJG('');
    setAlturaNJG('');
    setLarguraDTF('');
    setAlturaDTF('');
    setResultado(null);
    setResultado285(null);
    if (activeTool === 'fator') {
      setFundo('');
      setCores(Array(11).fill(''));
      setFatorResultado('');
    }
  };

  const handleCorChange = (index: number, value: string) => {
    const newCores = [...cores];
    newCores[index] = value;
    setCores(newCores);
  };

  const handleDownload = () => {
    const activeRes = activeTool === 'montagem' ? resultado : resultado285;
    if (!activeRes) return;

    const imgLogo = new Image();
    imgLogo.crossOrigin = "anonymous";
    imgLogo.src = "https://lh3.googleusercontent.com/d/1omT0tNA02xW5lBSE1sGEzuxHRl3_Amj_";
    imgLogo.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (activeTool === 'montagem' && resultado) {
          desenharPreview(ctx, canvas.width, canvas.height, resultado.blocos, true, imgLogo, CHAPA_LARGURA, CHAPA_ALTURA, DIVISOR_FINAL, parsedNJG.w, parsedNJG.h);
        } else if (activeTool === 'terceira' && resultado285) {
          desenharPreview(ctx, canvas.width, canvas.height, resultado285.blocos, true, imgLogo, 285, 1000, 1, parsedDTF.w, parsedDTF.h);
        }
        const linkImg = document.createElement('a');
        const dw = activeTool === 'montagem' ? parsedNJG.w : parsedDTF.w;
        const dh = activeTool === 'montagem' ? parsedNJG.h : parsedDTF.h;
        linkImg.download = `montagem-${dw}x${dh}.png`;
        linkImg.href = canvas.toDataURL('image/png');
        linkImg.click();
      }
    };
  };

  return (
    <div className="h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      {/* SaaS Sidebar */}
      <div className="w-16 md:w-20 bg-[#0F172A] flex flex-col items-center py-8 gap-8 z-20 shadow-2xl shrink-0">
        <div className="flex flex-col items-center gap-1 mb-4 px-2">
          <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/16-Gs6YJ_B6fWT3yoGB6ts0bB-kL9INK4" 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter mt-1">CÁLCULO</span>
        </div>
        
        <nav className="flex flex-col gap-4">
          <button 
            onClick={() => setActiveTool('montagem')}
            className={`p-3 rounded-xl transition-all duration-300 relative group ${activeTool === 'montagem' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          >
            <LayoutGrid size={22} />
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">CÁLCULO NJG</div>
          </button>
          
          <button 
            onClick={() => setActiveTool('fator')}
            className={`p-3 rounded-xl transition-all duration-300 relative group ${activeTool === 'fator' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          >
            <Palette size={22} />
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">FATOR ETIQUETA BORDADA</div>
          </button>
          
          <button 
            onClick={() => setActiveTool('terceira')}
            className={`p-3 rounded-xl transition-all duration-300 relative group ${activeTool === 'terceira' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          >
            <ArrowRightLeft size={22} />
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">FATOR DTF</div>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4 items-center pb-2">
           <button 
             onClick={handleLogout}
             className="p-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 group relative"
           >
             <LogOut size={22} />
             <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">SAIR DO SISTEMA</div>
           </button>
        </div>
      </div>

      {/* Control Panel Sidebar */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm z-10 overflow-hidden shrink-0">
        <header className="mb-8 flex items-center justify-between">
           <div>
             <div className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">CÁLCULO INDUSTRIAL</div>
             <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
               {activeTool === 'montagem' && 'Cálculo NJG'}
               {activeTool === 'fator' && 'Fator Etiqueta Bordada'}
               {activeTool === 'terceira' && 'Fator DTF'}
             </h1>
           </div>
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </header>

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 space-y-8 scroll-smooth custom-scrollbar">
          {(activeTool === 'montagem' || activeTool === 'terceira') && (
            <section className="space-y-6">
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Maximize2 size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Parâmetros de Entrada</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">UN: MM</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Comprimento (W)</label>
                    <input 
                      type="text" 
                      placeholder="0,00" 
                      value={activeTool === 'montagem' ? larguraNJG : larguraDTF} 
                      onChange={(e) => activeTool === 'montagem' ? setLarguraNJG(e.target.value) : setLarguraDTF(e.target.value)} 
                      className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-center text-sm shadow-sm" 
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Altura (H)</label>
                    <input 
                      type="text" 
                      placeholder="0,00" 
                      value={activeTool === 'montagem' ? alturaNJG : alturaDTF} 
                      onChange={(e) => activeTool === 'montagem' ? setAlturaNJG(e.target.value) : setAlturaDTF(e.target.value)} 
                      className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-center text-sm shadow-sm" 
                    />
                  </div>
                </div>
              </div>

              {(activeTool === 'montagem' ? resultado : resultado285) ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="relative overflow-hidden p-6 bg-[#0F172A] rounded-3xl text-white shadow-2xl shadow-blue-900/10">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Calculator size={80} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                        {activeTool === 'montagem' ? 'Resultado Final /3' : 'Total de Peças'}
                      </div>
                      <div className="text-6xl font-black tracking-tighter">
                        {activeTool === 'montagem' 
                          ? Math.floor((resultado?.quantidade || 0) / DIVISOR_FINAL) 
                          : (resultado285?.quantidade)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-24">
                      <div className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Peças Totais</div>
                      <div className="text-2xl font-extrabold text-slate-800">
                        {activeTool === 'montagem' ? resultado?.quantidade : resultado285?.quantidade}
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between h-24 overflow-hidden group">
                       <div className="text-amber-600/60 text-[9px] font-bold uppercase tracking-wider">Otimização</div>
                       <div className="text-xs font-bold text-amber-900 leading-tight">Distribuição Smart Ativa</div>
                       <div className="absolute -bottom-2 -right-2 text-amber-100 group-hover:scale-110 transition-transform">
                          <Maximize2 size={40} />
                       </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3">
                      <Grid3X3 className="text-blue-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">ESTRUTURA DE CORTE</div>
                        <div className="text-xs font-semibold text-slate-700 leading-tight">
                          {activeTool === 'montagem' ? resultado?.descricao : resultado285?.descricao}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                       <div>
                         <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Algoritmo</div>
                         <div className="text-[10px] font-bold text-slate-700">Heurística Grade V4</div>
                       </div>
                       <div>
                         <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Margem</div>
                         <div className="text-[10px] font-bold text-slate-700">0.00 mm (Zero-Gap)</div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 gap-4 group hover:border-blue-100 transition-colors">
                  <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors">
                     <Calculator size={32} strokeWidth={1.5} className="group-hover:text-blue-400" />
                  </div>
                  <p className="text-xs font-medium max-w-[200px]">Aguardando dimensões para processar os cálculos...</p>
                </div>
              )}
            </section>
          )}

          {activeTool === 'fator' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                    <Info size={12} />
                    FATOR CALCULADO
                  </div>
                  <div className="text-5xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform duration-500 origin-left">
                    {fatorResultado || '0,00000'}
                  </div>
                  <div className="mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest">Precisão Industrial (5 Casas)</div>
                </div>
                <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Palette size={100} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100 group">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-200">F</div>
                     <div>
                       <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">MATRIZ</span>
                       <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">Fundo Principal</span>
                     </div>
                  </div>
                  <input 
                    type="text" 
                    value={fundo} 
                    onChange={(e) => setFundo(e.target.value)}
                    className="w-28 h-10 px-4 bg-white border border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 font-black text-right text-sm shadow-sm outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cores de Pigmentação</label>
                    <span className="text-[9px] font-bold text-slate-300">MAX 11</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {cores.map((cor, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-[9px] font-black group-hover:bg-slate-800 group-hover:text-white transition-all">{i + 1}</div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Variante Industrial</span>
                        </div>
                        <input 
                          type="text" 
                          value={cor} 
                          onChange={(e) => handleCorChange(i, e.target.value)}
                          className="w-20 h-8 px-3 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-200 outline-none text-right text-xs font-bold transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-8 pt-6 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={clear} className="flex items-center justify-center gap-2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors"><Trash2 size={14} /> Limpar</button>
            <button 
              onClick={handleCopy} 
              disabled={(!resultado && activeTool === 'montagem') || (!resultado285 && activeTool === 'terceira') || (!fatorResultado && activeTool === 'fator')} 
              className="flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {copied ? 'Pronto!' : <><Copy size={14} /> Copiar Qtd</>}
            </button>
          </div>
          <div className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest opacity-50">
             Industrial Framework © 2026
          </div>
        </footer>
      </div>

      {/* Main Perspective Area */}
      <div className="flex-1 bg-[#F1F3F5] flex flex-col p-6 overflow-hidden min-h-0 relative">
        {(activeTool === 'montagem' || activeTool === 'terceira') ? (
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                 <span>FERRAMENTAS</span>
                 <ArrowRightLeft size={10} />
                 <span className="text-slate-800">
                    {activeTool === 'montagem' ? 'CÁLCULO NJG' : 'FATOR DTF'}
                 </span>
              </nav>
              <button 
                onClick={handleDownload} 
                disabled={activeTool === 'montagem' ? !resultado : !resultado285}
                className="flex items-center gap-2 px-5 h-10 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-[11px] shadow-sm transition-all disabled:opacity-50"
              >
                <Download size={16} /> GERAR PDF/PNG
              </button>
            </div>

            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 p-8 flex items-center justify-center overflow-hidden relative group">
              <canvas 
                ref={activeTool === 'montagem' ? canvasRef : canvasRef285} 
                width={1600} 
                height={1100} 
                className="max-w-full max-h-full object-contain filter drop-shadow-2xl" 
              />
              
              {!resultado && !resultado285 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] pointer-events-none">
                    <div className="text-slate-200/40">
                      <Eye size={120} strokeWidth={1} />
                    </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4 shrink-0">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl text-blue-600 flex items-center justify-center"><Maximize2 size={20} /></div>
                <div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Aproveitamento</div>
                  <div className="text-base font-black text-slate-800 leading-none">
                    {activeTool === 'montagem' 
                      ? (resultado ? `${((resultado.quantidade * parsedNJG.w * parsedNJG.h) / (CHAPA_LARGURA * CHAPA_ALTURA) * 100).toFixed(1)}%` : '0.0%')
                      : (resultado285 ? `${((resultado285.quantidade * parsedDTF.w * parsedDTF.h) / (285 * 1000) * 100).toFixed(1)}%` : '0.0%')
                    }
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl text-slate-400 flex items-center justify-center font-black text-[10px]">L|A</div>
                <div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dimensão Chapa</div>
                  <div className="text-base font-black text-slate-800 leading-none">
                    {activeTool === 'montagem' ? `${CHAPA_LARGURA}x${CHAPA_ALTURA}` : '285x1000'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-4 col-span-2">
                <div className="w-10 h-10 bg-blue-500 rounded-xl text-white flex items-center justify-center"><Info size={20} /></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Status do Sistema</div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div className="text-[11px] font-bold text-white truncate opacity-90 tracking-tight">
                    {activeTool === 'montagem' 
                      ? 'Processando algoritmo de grade v8.2' 
                      : 'Cálculo de aproveitamento DTF ativo'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="bg-white p-16 rounded-[4rem] border border-slate-200 shadow-2xl max-w-2xl text-center relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
               <div className="p-8 bg-blue-50 rounded-full inline-flex mb-8 text-blue-600 group-hover:scale-110 transition-transform duration-500">
                  <Palette size={64} strokeWidth={1} />
               </div>
               <h3 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tighter">Fator Etiqueta Bordada</h3>
               <p className="text-slate-500 text-lg leading-relaxed font-medium">
                 O sistema está aguardando os valores de <span className="text-blue-600 font-bold">fundo e pigmentação</span> para determinar o fator industrial exato com precisão de 5 casas decimais.
               </p>
               <div className="mt-12 flex justify-center gap-4">
                  <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase border border-slate-100">Algoritmo Linear</div>
                  <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase border border-slate-100">JSON Export Ready</div>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

