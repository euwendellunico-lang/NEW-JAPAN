/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Bloco {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: boolean;
}

export interface Resultado {
  quantidade: number;
  descricao: string;
  sobra_largura: number;
  sobra_altura: number;
  blocos: Bloco[];
}

export const CHAPA_LARGURA = 646;
export const CHAPA_ALTURA = 458;
export const DIVISOR_FINAL = 3;

function criarResultado(
  quantidade: number,
  descricao: string,
  sobra_largura: number,
  sobra_altura: number,
  blocos: Bloco[]
): Resultado {
  return { quantidade, descricao, sobra_largura, sobra_altura, blocos };
}

function melhorResultado(atual: Resultado | null, novo: Resultado | null): Resultado | null {
  if (!novo) return atual;
  if (!atual) return novo;
  if (novo.quantidade > atual.quantidade) return novo;
  if (novo.quantidade === atual.quantidade) {
    const sobraAtual = atual.sobra_largura + atual.sobra_altura;
    const sobraNova = novo.sobra_largura + novo.sobra_altura;
    if (sobraNova < sobraAtual) return novo;
  }
  return atual;
}

function gerarPecasGrade(
  x0: number,
  y0: number,
  area_largura: number,
  area_altura: number,
  item_largura: number,
  item_altura: number,
  rotacionado: boolean
): Bloco[] {
  const pecas: Bloco[] = [];
  if (item_largura <= 0 || item_altura <= 0) return pecas;

  const colunas = Math.floor(area_largura / item_largura);
  const linhas = Math.floor(area_altura / item_altura);

  for (let c = 0; c < colunas; c++) {
    for (let l = 0; l < linhas; l++) {
      pecas.push({
        x: x0 + c * item_largura,
        y: y0 + l * item_altura,
        w: item_largura,
        h: item_altura,
        rot: rotacionado,
      });
    }
  }
  return pecas;
}

function melhorGradeComSobra(w: number, h: number): Resultado | null {
  let melhor: Resultado | null = null;

  // Grade Normal
  const colunasN = Math.floor(CHAPA_LARGURA / w);
  const linhasN = Math.floor(CHAPA_ALTURA / h);
  if (colunasN > 0 && linhasN > 0) {
    const qtd = colunasN * linhasN;
    const blocos = gerarPecasGrade(0, 0, CHAPA_LARGURA, CHAPA_ALTURA, w, h, false);
    melhor = melhorResultado(
      melhor,
      criarResultado(qtd, `Grade normal: ${colunasN} x ${linhasN}`, CHAPA_LARGURA - colunasN * w, CHAPA_ALTURA - linhasN * h, blocos)
    );
  }

  // Grade Girada
  const colunasG = Math.floor(CHAPA_LARGURA / h);
  const linhasG = Math.floor(CHAPA_ALTURA / w);
  if (colunasG > 0 && linhasG > 0) {
    const qtd = colunasG * linhasG;
    const blocos = gerarPecasGrade(0, 0, CHAPA_LARGURA, CHAPA_ALTURA, h, w, true);
    melhor = melhorResultado(
      melhor,
      criarResultado(qtd, `Grade girada: ${colunasG} x ${linhasG}`, CHAPA_LARGURA - colunasG * h, CHAPA_ALTURA - linhasG * w, blocos)
    );
  }

  return melhor;
}

function melhorPorFaixasVerticais(w: number, h: number): Resultado | null {
  let melhor: Resultado | null = null;

  const qtdColunaNormal = Math.floor(CHAPA_ALTURA / h);
  const qtdColunaGirada = Math.floor(CHAPA_ALTURA / w);

  const maxColunasNormais = w > 0 ? Math.floor(CHAPA_LARGURA / w) : 0;
  const maxColunasGiradas = h > 0 ? Math.floor(CHAPA_LARGURA / h) : 0;

  for (let col_normais = 0; col_normais <= maxColunasNormais; col_normais++) {
    for (let col_giradas = 0; col_giradas <= maxColunasGiradas; col_giradas++) {
      const larguraUsada = col_normais * w + col_giradas * h;
      if (larguraUsada > CHAPA_LARGURA + 1e-9) continue;

      const quantidade = col_normais * qtdColunaNormal + col_giradas * qtdColunaGirada;
      const sobraLargura = CHAPA_LARGURA - larguraUsada;
      const sobraAltura = 0;

      const descricao = `Verticais: ${col_normais} col. normais (${qtdColunaNormal}/col) + ${col_giradas} col. giradas (${qtdColunaGirada}/col)`;
      
      const blocos: Bloco[] = [];
      if (col_normais > 0) {
        blocos.push(...gerarPecasGrade(0, 0, col_normais * w, CHAPA_ALTURA, w, h, false));
      }
      if (col_giradas > 0) {
        blocos.push(...gerarPecasGrade(col_normais * w, 0, col_giradas * h, CHAPA_ALTURA, h, w, true));
      }

      melhor = melhorResultado(
        melhor,
        criarResultado(quantidade, descricao, sobraLargura, sobraAltura, blocos)
      );
    }
  }
  return melhor;
}

function melhorPorFaixasHorizontais(w: number, h: number): Resultado | null {
  let melhor: Resultado | null = null;

  const qtdLinhaNormal = Math.floor(CHAPA_LARGURA / w);
  const qtdLinhaGirada = Math.floor(CHAPA_LARGURA / h);

  const maxLinhasNormais = h > 0 ? Math.floor(CHAPA_ALTURA / h) : 0;
  const maxLinhasGiradas = w > 0 ? Math.floor(CHAPA_ALTURA / w) : 0;

  for (let lin_normais = 0; lin_normais <= maxLinhasNormais; lin_normais++) {
    for (let lin_giradas = 0; lin_giradas <= maxLinhasGiradas; lin_giradas++) {
      const alturaUsada = lin_normais * h + lin_giradas * w;
      if (alturaUsada > CHAPA_ALTURA + 1e-9) continue;

      const quantidade = lin_normais * qtdLinhaNormal + lin_giradas * qtdLinhaGirada;
      const sobraLargura = 0;
      const sobraAltura = CHAPA_ALTURA - alturaUsada;

      const descricao = `Horizontais: ${lin_normais} lin. normais (${qtdLinhaNormal}/lin) + ${lin_giradas} lin. giradas (${qtdLinhaGirada}/lin)`;
      
      const blocos: Bloco[] = [];
      if (lin_normais > 0) {
        blocos.push(...gerarPecasGrade(0, 0, CHAPA_LARGURA, lin_normais * h, w, h, false));
      }
      if (lin_giradas > 0) {
        blocos.push(...gerarPecasGrade(0, lin_normais * h, CHAPA_LARGURA, lin_giradas * w, h, w, true));
      }

      melhor = melhorResultado(
        melhor,
        criarResultado(quantidade, descricao, sobraLargura, sobraAltura, blocos)
      );
    }
  }
  return melhor;
}

export function calcularMelhorDistribuicao(w: number, h: number): Resultado | null {
  if (w <= 0 || h <= 0) return null;
  
  let melhor: Resultado | null = null;
  melhor = melhorResultado(melhor, melhorGradeComSobra(w, h));
  melhor = melhorResultado(melhor, melhorPorFaixasVerticais(w, h));
  melhor = melhorResultado(melhor, melhorPorFaixasHorizontais(w, h));
  
  return melhor;
}
