/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calculator, 
  Trash2, 
  Copy, 
  Eye, 
  Download, 
  Maximize2, 
  ArrowRightLeft, 
  Grid3X3,
  Info
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

export default function App() {
  const [largura, setLargura] = useState<string>('');
  const [altura, setAltura] = useState<string>('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copied, setCopied] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const parsedLargura = useMemo(() => {
    const val = parseFloat(largura.replace(',', '.'));
    return isNaN(val) ? 0 : val;
  }, [largura]);

  const parsedAltura = useMemo(() => {
    const val = parseFloat(altura.replace(',', '.'));
    return isNaN(val) ? 0 : val;
  }, [altura]);

  useEffect(() => {
    if (parsedLargura > 0 && parsedAltura > 0) {
      const res = calcularMelhorDistribuicao(parsedLargura, parsedAltura);
      setResultado(res);
    } else {
      setResultado(null);
    }
  }, [parsedLargura, parsedAltura]);

  const desenharPreview = (ctx: CanvasRenderingContext2D, width: number, height: number, blocos: Bloco[], isDownload = false, logoImg?: HTMLImageElement) => {
    if (isDownload) {
      // Preencher fundo com branco total para evitar transparência (alfa)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    
    const margemSuperior = isDownload ? 120 : 40;
    const margemLateral = isDownload ? 10 : 40;
    
    const escalaX = (width - 2 * margemLateral) / CHAPA_LARGURA;
    const escalaY = (height - (isDownload ? 160 : margemSuperior) - margemLateral) / CHAPA_ALTURA;
    const escala = Math.min(escalaX, escalaY);

    const larguraDesenho = CHAPA_LARGURA * escala;
    const alturaDesenho = CHAPA_ALTURA * escala;
    const xIni = (width - larguraDesenho) / 2;
    const yIni = isDownload ? 100 : (height - alturaDesenho) / 2;

    if (isDownload) {
      // Cabeçalho do Relatório na Imagem - Estilo Original
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(0, 0, width, 90);
      
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 24px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('CÁLCULO NJG - RELATÓRIO DE MONTAGEM', 30, 40);
      
      ctx.font = '14px Inter';
      ctx.fillStyle = '#52525b';
      const infoText = `Item: ${parsedLargura} x ${parsedAltura} mm | Total Peças: ${resultado?.quantidade} | Resultado Final (/3): ${Math.floor((resultado?.quantidade || 0) / DIVISOR_FINAL)}`;
      ctx.fillText(infoText, 30, 65);
      
      ctx.font = '14px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, width - 30, 40);
      ctx.fillText(`Chapa: ${CHAPA_LARGURA} x ${CHAPA_ALTURA} mm`, width - 30, 65);

      // Logo no Rodapé do PNG - Ainda menor conforme solicitado
      if (logoImg) {
        const logoTargetW = 120; // Reduzido de 180 para 120
        const logoTargetH = (logoImg.height / logoImg.width) * logoTargetW;
        const logoX = (width - logoTargetW) / 2;
        const logoY = height - logoTargetH - 15;
        ctx.drawImage(logoImg, logoX, logoY, logoTargetW, logoTargetH);
      }
    }

    // Chapa Base
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.fillRect(xIni, yIni, larguraDesenho, alturaDesenho);
    ctx.strokeRect(xIni, yIni, larguraDesenho, alturaDesenho);

    // Blocos
    blocos.forEach((bloco, i) => {
      const x1 = xIni + bloco.x * escala;
      const y1 = yIni + bloco.y * escala;
      const bw = bloco.w * escala;
      const bh = bloco.h * escala;

      ctx.fillStyle = bloco.rot ? '#f9161615' : '#1e027315';
      ctx.strokeStyle = bloco.rot ? '#f91616' : '#1e0273';
      ctx.lineWidth = 1;
      
      ctx.fillRect(x1, y1, bw, bh);
      ctx.strokeRect(x1, y1, bw, bh);

      if (bw > 25 && bh > 18) {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), x1 + bw / 2, y1 + bh / 2);
      }
    });

    if (!isDownload) {
      ctx.fillStyle = '#71717a';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${CHAPA_LARGURA} x ${CHAPA_ALTURA} mm`, width / 2, yIni - 15);
    }
  };

  useEffect(() => {
    if (canvasRef.current && resultado) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        desenharPreview(ctx, canvas.width, canvas.height, resultado.blocos);
      }
    } else if (canvasRef.current && !resultado) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [resultado]);

  const handleCopy = () => {
    if (!resultado) return;
    const finalVal = Math.floor(resultado.quantidade / DIVISOR_FINAL).toString();
    navigator.clipboard.writeText(finalVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!resultado) return;
    
    // Carregar a logo para o rodapé do PNG (Novo link fornecido)
    const imgLogo = new Image();
    imgLogo.crossOrigin = "anonymous";
    imgLogo.referrerPolicy = "no-referrer";
    imgLogo.src = "https://lh3.googleusercontent.com/d/1omT0tNA02xW5lBSE1sGEzuxHRl3_Amj_";
    
    imgLogo.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; // Reduzido para aproximar as laterais
      canvas.height = 760; // Ajustado para ser mais proporcional
      const ctx = canvas.getContext('2d');
      if (ctx) {
        desenharPreview(ctx, canvas.width, canvas.height, resultado.blocos, true, imgLogo);
        
        const linkImg = document.createElement('a');
        linkImg.download = `montagem-${parsedLargura}x${parsedAltura}.png`;
        linkImg.href = canvas.toDataURL('image/png');
        linkImg.click();
      }
    };

    imgLogo.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 760; 
      const ctx = canvas.getContext('2d');
      if (ctx) {
        desenharPreview(ctx, canvas.width, canvas.height, resultado.blocos, true);
        const linkImg = document.createElement('a');
        linkImg.download = `montagem-${parsedLargura}x${parsedAltura}.png`;
        linkImg.href = canvas.toDataURL('image/png');
        linkImg.click();
      }
    };
  };

  const clear = () => {
    setLargura('');
    setAltura('');
    setResultado(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans text-zinc-900">
      {/* Sidebar - Entry & Quick Stats */}
      <div className="w-full md:w-96 bg-white border-b md:border-b-0 md:border-r border-zinc-200 p-6 flex flex-col shadow-sm z-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center">
            <img 
              src="https://lh3.googleusercontent.com/d/16-Gs6YJ_B6fWT3yoGB6ts0bB-kL9INK4" 
              alt="Icon NJG" 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CÁLCULO NJG</h1>
        </div>

        <div className="space-y-4 mb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Dimensões do Item (mm)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input 
                  type="text" 
                  id="input-largura"
                  placeholder="Largura"
                  value={largura}
                  onChange={(e) => setLargura(e.target.value)}
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e0273] transition-all font-medium text-center"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-zinc-400">L</span>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  id="input-altura"
                  placeholder="Altura"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e0273] transition-all font-medium text-center"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-zinc-400">A</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              id="btn-limpar"
              onClick={clear}
              className="flex items-center justify-center gap-2 h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors font-semibold text-sm"
            >
              <Trash2 size={16} /> Limpar
            </button>
            <button 
              id="btn-copy"
              onClick={handleCopy}
              disabled={!resultado}
              className="flex items-center justify-center gap-2 h-11 bg-[#1e0273]/5 text-[#1e0273] hover:bg-[#1e0273]/10 disabled:opacity-50 disabled:grayscale rounded-xl transition-all font-semibold text-sm border border-[#1e0273]/10"
            >
              {copied ? 'Copiado!' : <><Copy size={16} /> Copiar /3</>}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {resultado ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-4"
              >
                <div className="p-4 bg-zinc-900 rounded-2xl text-white shadow-xl">
                  <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Resultado Final (/3)</div>
                  <div className="text-5xl font-black">{Math.floor(resultado.quantidade / DIVISOR_FINAL)}</div>
                  <div className="mt-2 text-zinc-500 text-xs text-balance">Aproximado para baixo seguindo a regra de negócio.</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-[#1e0273]/5 rounded-2xl border border-[#1e0273]/10">
                    <div className="text-[#1e0273]/60 text-[10px] font-bold uppercase mb-1">Total Peças</div>
                    <div className="text-2xl font-bold text-[#1e0273]">{resultado.quantidade}</div>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="text-amber-600/60 text-[10px] font-bold uppercase mb-1">Orientação</div>
                    <div className="text-xs font-bold text-amber-800 leading-tight">Otimizado Aut.</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800 rounded-full w-fit shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1e0273]" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">Normal</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800 rounded-full w-fit shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f91616]" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">Rotacionado</span>
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-start gap-3 p-3 bg-white border border-zinc-100 rounded-xl shadow-sm">
                      <Grid3X3 className="text-zinc-400 shrink-0 mt-1" size={18} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Distribuição</div>
                        <div className="text-sm font-medium text-zinc-700 leading-tight break-words">{resultado.descricao}</div>
                      </div>
                   </div>
                   <div className="flex items-start gap-3 p-3 bg-white border border-zinc-100 rounded-xl shadow-sm">
                      <Info className="text-zinc-400 shrink-0 mt-1" size={18} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Sobra da Chapa</div>
                        <div className="text-sm font-medium text-zinc-700 leading-tight">
                          L: {resultado.sobra_largura.toFixed(2)} mm<br/>
                          A: {resultado.sobra_altura.toFixed(2)} mm
                        </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 rounded-3xl"
              >
                <div className="bg-zinc-100 p-4 rounded-full text-zinc-300 mb-4">
                  <Maximize2 size={40} />
                </div>
                <p className="text-zinc-400 text-sm font-medium">Informe largura e altura para calcular a melhor montagem</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo NJG - Removed pb and added -mb to touch the line */}
          <div className="mt-auto w-full flex justify-center overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/19m7wVWs5aV_P3FzonAjM6aM5xq7H0ats" 
              alt="Logo NJG" 
              className="max-w-[420px] w-full h-auto object-contain opacity-95 -mb-10"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-1">
           <div className="text-[10px] text-zinc-400 font-medium leading-relaxed">
             CHAPA PADRÃO: {CHAPA_LARGURA} x {CHAPA_ALTURA} mm<br/>
             DIVISOR CALCULADO: / {DIVISOR_FINAL}
           </div>
        </div>
      </div>

      {/* Main Area - Preview */}
      <div className="flex-1 bg-zinc-100/50 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="hidden lg:block">
            <h2 className="text-lg font-bold text-zinc-700">Visualização da Montagem</h2>
            <p className="text-sm text-zinc-500">Visualização em escala real da distribuição dos itens</p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
              id="btn-download"
              onClick={handleDownload}
              disabled={!resultado}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 h-11 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl transition-all font-semibold text-sm shadow-sm disabled:opacity-50"
            >
              <Download size={18} /> Salvar PNG
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-zinc-200 shadow-inner overflow-hidden relative group flex items-center justify-center">
          <canvas 
            id="canvas-preview"
            ref={canvasRef}
            width={1600}
            height={1200}
            className="max-w-full max-h-full object-contain"
          />
          
          {!resultado && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-zinc-200 transform scale-[4] opacity-20">
                <Maximize2 size={48} />
              </div>
            </div>
          )}

          <div className="absolute bottom-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] font-bold">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> NORMAL
            </div>
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] font-bold">
              <div className="w-2 h-2 rounded-full bg-orange-500" /> ROTACIONADO
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                <Maximize2 size={24} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Aproveitamento</div>
                <div className="text-lg font-bold text-zinc-800">
                  {resultado ? `${((resultado.quantidade * parsedLargura * parsedAltura) / (CHAPA_LARGURA * CHAPA_ALTURA) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
           </div>
           
           <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="bg-zinc-50 p-3 rounded-xl text-zinc-400 text-xs font-mono font-bold">
                IMG
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Resolução Canvas</div>
                <div className="text-lg font-bold text-zinc-800">1600x1200</div>
              </div>
           </div>

           <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="bg-zinc-50 p-3 rounded-xl text-zinc-400">
                <Eye size={24} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Navegador</div>
                <div className="text-lg font-bold text-zinc-800 truncate">V8 / React 19</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
