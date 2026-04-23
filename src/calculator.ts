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

export function calcularMelhorDistribuicao(
  w: number, 
  h: number, 
  chapa_l: number = CHAPA_LARGURA, 
  chapa_a: number = CHAPA_ALTURA
): Resultado | null {
  if (w <= 0 || h <= 0) return null;

  function melhorGradeComSobra(w: number, h: number): Resultado | null {
    let melhor: Resultado | null = null;
    const colunasN = Math.floor(chapa_l / w);
    const linhasN = Math.floor(chapa_a / h);
    if (colunasN > 0 && linhasN > 0) {
      const qtd = colunasN * linhasN;
      const blocos = gerarPecasGrade(0, 0, chapa_l, chapa_a, w, h, false);
      melhor = melhorResultado(
        melhor,
        criarResultado(qtd, `Grade normal: ${colunasN} x ${linhasN}`, chapa_l - colunasN * w, chapa_a - linhasN * h, blocos)
      );
    }
    const colunasG = Math.floor(chapa_l / h);
    const linhasG = Math.floor(chapa_a / w);
    if (colunasG > 0 && linhasG > 0) {
      const qtd = colunasG * linhasG;
      const blocos = gerarPecasGrade(0, 0, chapa_l, chapa_a, h, w, true);
      melhor = melhorResultado(
        melhor,
        criarResultado(qtd, `Grade girada: ${colunasG} x ${linhasG}`, chapa_l - colunasG * h, chapa_a - linhasG * w, blocos)
      );
    }
    return melhor;
  }

  function melhorPorFaixasVerticais(w: number, h: number): Resultado | null {
    let melhor: Resultado | null = null;
    const qtdColunaNormal = Math.floor(chapa_a / h);
    const qtdColunaGirada = Math.floor(chapa_a / w);
    const maxColunasNormais = w > 0 ? Math.floor(chapa_l / w) : 0;
    const maxColunasGiradas = h > 0 ? Math.floor(chapa_l / h) : 0;
    for (let col_normais = 0; col_normais <= maxColunasNormais; col_normais++) {
      for (let col_giradas = 0; col_giradas <= maxColunasGiradas; col_giradas++) {
        const larguraUsada = col_normais * w + col_giradas * h;
        if (larguraUsada > chapa_l + 1e-9) continue;
        const quantidade = col_normais * qtdColunaNormal + col_giradas * qtdColunaGirada;
        const sobraLargura = chapa_l - larguraUsada;
        const sobraAltura = 0;
        const descricao = `Verticais: ${col_normais} col. normais (${qtdColunaNormal}/col) + ${col_giradas} col. giradas (${qtdColunaGirada}/col)`;
        const blocos: Bloco[] = [];
        if (col_normais > 0) blocos.push(...gerarPecasGrade(0, 0, col_normais * w, chapa_a, w, h, false));
        if (col_giradas > 0) blocos.push(...gerarPecasGrade(col_normais * w, 0, col_giradas * h, chapa_a, h, w, true));
        melhor = melhorResultado(melhor, criarResultado(quantidade, descricao, sobraLargura, sobraAltura, blocos));
      }
    }
    return melhor;
  }

  function melhorPorFaixasHorizontais(w: number, h: number): Resultado | null {
    let melhor: Resultado | null = null;
    const qtdLinhaNormal = Math.floor(chapa_l / w);
    const qtdLinhaGirada = Math.floor(chapa_l / h);
    const maxLinhasNormais = h > 0 ? Math.floor(chapa_a / h) : 0;
    const maxLinhasGiradas = w > 0 ? Math.floor(chapa_a / w) : 0;
    for (let lin_normais = 0; lin_normais <= maxLinhasNormais; lin_normais++) {
      for (let lin_giradas = 0; lin_giradas <= maxLinhasGiradas; lin_giradas++) {
        const alturaUsada = lin_normais * h + lin_giradas * w;
        if (alturaUsada > chapa_a + 1e-9) continue;
        const quantidade = lin_normais * qtdLinhaNormal + lin_giradas * qtdLinhaGirada;
        const sobraLargura = 0;
        const sobraAltura = chapa_a - alturaUsada;
        const descricao = `Horizontais: ${lin_normais} lin. normais (${qtdLinhaNormal}/lin) + ${lin_giradas} lin. giradas (${qtdLinhaGirada}/lin)`;
        const blocos: Bloco[] = [];
        if (lin_normais > 0) blocos.push(...gerarPecasGrade(0, 0, chapa_l, lin_normais * h, w, h, false));
        if (lin_giradas > 0) blocos.push(...gerarPecasGrade(0, lin_normais * h, chapa_l, lin_giradas * w, h, w, true));
        melhor = melhorResultado(melhor, criarResultado(quantidade, descricao, sobraLargura, sobraAltura, blocos));
      }
    }
    return melhor;
  }
  
  let melhor: Resultado | null = null;
  melhor = melhorResultado(melhor, melhorGradeComSobra(w, h));
  melhor = melhorResultado(melhor, melhorPorFaixasVerticais(w, h));
  melhor = melhorResultado(melhor, melhorPorFaixasHorizontais(w, h));
  
  return melhor;
}
