// ==== Normalização & limites ====
export function removeAcentos(str = ''): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitize(str = ''): string {
  return removeAcentos(String(str)).replace(/[^\w\s\-\.:,\/]/g, '');
}

export function upper(str = ''): string {
  return sanitize(str).toUpperCase().trim();
}

export function moneyBRL(strOuNumero: string | number): string {
  if (typeof strOuNumero === 'number') {
    return 'R$ ' + strOuNumero.toFixed(2).replace('.', ',');
  }
  // já vem "10,00" etc
  return strOuNumero.startsWith('R$') ? strOuNumero : `R$ ${strOuNumero}`;
}

// Corta respeitando limite e adiciona "…" se precisar
export function fit(str = '', max: number): string {
  const s = upper(str);
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}

// ==== URL do Labelary ====
export function encodeZPLForLabelary(zpl: string, {widthMM, heightMM, density = 8, rotation = 0}: {
  widthMM: number;
  heightMM: number;
  density?: number;
  rotation?: number;
}): string {
  const base = 'https://labelary.com/viewer.html';
  const params = new URLSearchParams({
    density: String(density),
    quality: 'bitonal',
    width: String(widthMM),
    height: String(heightMM),
    units: 'mm',
    index: '0',
    rotation: String(rotation),
    zpl: zpl
  });
  return `${base}?${params.toString()}`;
}

// ==== Envio RAW p/ impressora IP:9100 via backend ====
export async function sendToPrinter({ip, port = 9100, payload}: {
  ip: string;
  port?: number;
  payload: string;
}): Promise<{ok: boolean; printer?: string; error?: string}> {
  try {
    const response = await fetch('/api/printRaw', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ ip, port, payload })
    });
    return await response.json();
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// ==== Geradores ZPL e PPLA ====

export interface ProductData {
  nome: string;
  ref: string;
  tam: string;
  preco: number | string;
  fornecedor: string;
  codigo128: string;
  url_qr: string;
}

// ZPL — Código de Barras 60×12mm (visualização/print ZPL)
export function genZPL_Barra_60x12(p: ProductData): string {
  const N = fit(p.nome, 24);
  const F = fit(p.fornecedor || 'SEM FORNECEDOR', 18);
  const R$ = moneyBRL(p.preco);
  const COD = upper(p.codigo128 || p.ref || 'SKU');

  // 60mm*24=1440; 12mm*24=288. Labelary aceita PW=1438
  return [
    '^XA','^CI28','^PW1438','^LL288','^LH0,0','^LS0',
    // Cabeçalho (nome)
    '^FO24,24^A0N,54,54^FB1390,2,0,L,0',
    `^FD${N}\\&^FS`,
    // Fornecedor
    '^FO24,90^A0N,48,48^FB1390,1,0,L,0',
    `^FD${F}\\&^FS`,
    // Preço (se quiser junto do nome, mude posição)
    '^FO720,30^A0N,54,54',
    `^FD${N} ${R$}^FS`, // pode trocar por só preço
    // Barcode
    '^BY6,2,168',
    `^FO670,90^BCN,130,N,N,N^FD${COD}^FS`,
    '^FO670,230^A0N,39,39^FB700,1,0,C,0',
    `^FD${COD}\\&^FS`,
    '^XZ'
  ].join('\n');
}

// Posicionamento dinâmico do nome baseado no número de caracteres
function getNameYPosition(nameLength: number): number {
  // Fórmula: Y = 450 - (num_chars - 1) * 20
  const y = 450 - (nameLength - 1) * 20;
  return Math.max(20, Math.min(450, y));
}

// Posicionamento dinâmico do tamanho baseado no número de caracteres
function getSizeYPosition(sizeLength: number): number {
  const positions: Record<number, number> = {
    1: 266,  // 1 caractere: FO250,266
    2: 236,  // 2 caracteres: FO250,236
    3: 206,  // 3 caracteres: FO250,206
    4: 176,  // 4 caracteres: FO250,176
    5: 140   // 5 caracteres: FO250,140
  };
  return positions[sizeLength] || 140; // valor padrão para máximo de caracteres
}

// Posicionamento dinâmico do fornecedor baseado no número de caracteres
function getSupplierYPosition(supplierLength: number): number {
  const positions: Record<number, number> = {
    1: 366,  // 1 caractere: FO340,366
    2: 340,  // 2 caracteres: FO340,340
    3: 310,  // 3 caracteres: FO340,310
    4: 280,  // 4 caracteres: FO340,280
    5: 250,  // 5 caracteres: mantém coordenada original
    6: 220,  // 6 caracteres: mantém coordenada original
    7: 185,  // 7 caracteres: mantém coordenada original
    8: 155,  // 8 caracteres: mantém coordenada original
    9: 125,  // 9 caracteres: mantém coordenada original
    10: 100, // 10 caracteres: mantém coordenada original
    11: 75,  // 11 caracteres: mantém coordenada original
    12: 45,  // 12 caracteres: mantém coordenada original
    13: 15   // 13 caracteres: mantém coordenada original
  };
  return positions[supplierLength] || 15; // valor padrão para máximo de caracteres
}

// ZPL — QR 40×30mm, 3 colunas deitado com posições dinâmicas
function zplColuna({coluna, titulo, ref, tam, forn, preco, url, nameY, sizeY, supplierY}: {
  coluna: 1 | 2 | 3;
  titulo: string;
  ref: string;
  tam: string;
  forn: string;
  preco: string;
  url: string;
  nameY: number;
  sizeY: number;
  supplierY: number;
}): string {
  // Posições exatas baseadas no modelo perfeito
  const positions = {
    1: { nome: [50, nameY], cod: [160, 100], tam: [250, sizeY], forn: [340, supplierY], preco: [520, 120], qr: [150, 470] },
    2: { nome: [767, nameY], cod: [879, 100], tam: [969, sizeY], forn: [1059, supplierY], preco: [1239, 120], qr: [869, 470] },
    3: { nome: [1486, nameY], cod: [1598, 100], tam: [1688, sizeY], forn: [1778, supplierY], preco: [1958, 120], qr: [1588, 470] }
  };
  
  const pos = positions[coluna];
  
  return [
    `^FO${pos.nome[0]},${pos.nome[1]}^A0B,72,72^FD${titulo}^FS`,
    `^FO${pos.cod[0]},${pos.cod[1]}^A0B,66,66^FDCOD: ${ref}^FS`,
    `^FO${pos.tam[0]},${pos.tam[1]}^A0B,66,66^FDTAM: ${tam}^FS`,
    `^FO${pos.forn[0]},${pos.forn[1]}^A0B,55,55^FDF: ${forn}^FS`,
    `^FO${pos.preco[0]},${pos.preco[1]}^A0B,78,78^FD${preco}^FS`,
    `^FO${pos.qr[0]},${pos.qr[1]}^BQB,2,15^FDQA,${url}^FS`
  ].join('\n');
}

export function genZPL_QR_40x30_cols(p: ProductData, cols = 3): string {
  const titulo = fit(p.nome, 22);  // Atualizado para 22 caracteres
  const ref = upper(p.ref || '');
  const tam = upper(p.tam || '');
  const forn = fit(p.fornecedor || 'SEM FORNECEDOR', 13);
  const preco = moneyBRL(p.preco);
  const url = p.url_qr || 'https://inlove.app';

  // Debug: verificar dados do fornecedor na função principal
  console.log('🏷️ [genZPL_QR_40x30_cols] Debug do fornecedor:', {
    produtoNome: p.nome,
    fornecedorOriginal: p.fornecedor,
    fornecedorFit: forn,
    fornecedorLength: forn.length,
    fornecedorEmpty: forn === '',
    fornecedorIsDefault: forn === 'SEM FORNECEDOR'
  });

  // Calcular posição Y dinâmica do nome, tamanho e fornecedor
  const nameY = getNameYPosition(titulo.length);
  const sizeY = getSizeYPosition(tam.length);
  const supplierY = getSupplierYPosition(forn.length);

  const c1 = zplColuna({coluna: 1, titulo, ref, tam, forn, preco, url, nameY, sizeY, supplierY});
  const c2 = zplColuna({coluna: 2, titulo, ref, tam, forn, preco, url, nameY, sizeY, supplierY});
  const c3 = zplColuna({coluna: 3, titulo, ref, tam, forn, preco, url, nameY, sizeY, supplierY});

  return [
    '^XA','^PW2157','^LL960','^LS0','^CI28','^FWI',
    '^FO719,0^GB1,960,1^FS','^FO1438,0^GB1,960,1^FS',
    (cols >= 1 ? c1 : ''), (cols >= 2 ? c2 : ''), (cols >= 3 ? c3 : ''),
    '^XZ'
  ].join('\n');
}

// PPLA — Código de Barras 60×12mm (Argox OS-214 Plus)
export function genPPLA_Barra_60x12(p: ProductData): string {
  const N = fit(p.nome, 16);
  const F = fit(p.fornecedor || 'SEM FORNECEDOR', 18);
  const R$ = moneyBRL(p.preco);
  const COD = upper(p.codigo128 || p.ref || 'SKU');

  return [
    'SIZE 60 mm,12 mm',
    'GAP 2 mm,0',
    'SPEED 3',
    'DENSITY 8',
    'DIRECTION 1',
    'REFERENCE 0,0',
    'CLS',
    `TEXT 8,8,"1",0,2,4,"${N}"`,
    `TEXT 8,50,"1",0,2,2,"${F}"`,
    `TEXT 260,8,"1",0,2,4,"${N} ${R$}"`,
    `BARCODE 260,28,"128",40,0,0,2,4,"${COD}"`,
    `TEXT 260,74,"1",0,2,1,"${COD}"`,
    'PRINT 1,1'
  ].join('\n');
}

// ==== Ações dos Botões ====

export interface LabelPackage {
  mime: string;
  ext: string;
  zpl?: string;
  ppla?: string;
  widthMM: number;
  heightMM: number;
}

export function buildLabel({produto, tipoEtq, linguagem, cols = 3}: {
  produto: ProductData;
  tipoEtq: 'barcode' | 'qr';
  linguagem: 'ZPL' | 'PPLA';
  cols?: number;
}): LabelPackage {
  if (tipoEtq === 'qr') {
    // QR só em ZPL
    return {
      mime: 'text/plain',
      ext: 'zpl',
      zpl: genZPL_QR_40x30_cols(produto, cols),
      widthMM: 90,
      heightMM: 40
    };
  } else {
    if (linguagem === 'PPLA') {
      const ppla = genPPLA_Barra_60x12(produto);
      return {
        mime: 'text/plain',
        ext: 'ppla',
        ppla,
        widthMM: 60,
        heightMM: 12
      };
    } else {
      const zpl = genZPL_Barra_60x12(produto);
      return {
        mime: 'text/plain',
        ext: 'zpl',
        zpl,
        widthMM: 60,
        heightMM: 12
      };
    }
  }
}

export function onVisualizar(produto: ProductData, tipoEtq: 'barcode' | 'qr', linguagem: 'ZPL' | 'PPLA', cols: number, novaAba = true): void {
  const pack = buildLabel({produto, tipoEtq, linguagem, cols});
  // Labelary visualiza ZPL; para PPLA, mostre alerta e force ZPL (visualização)
  if (pack.zpl) {
    // QR code usa 24dpmm (608 DPI), código de barras mantém 8dpmm (203 DPI)
    const density = tipoEtq === 'qr' ? 24 : 8;
    const url = encodeZPLForLabelary(pack.zpl, { 
      widthMM: pack.widthMM, 
      heightMM: pack.heightMM, 
      density 
    });
    if (novaAba) window.open(url, '_blank');
    else location.href = url;
  } else {
    alert('Visualização online só suporta ZPL. Selecione ZPL ou use "Baixar arquivo" e imprima pelo driver.');
  }
}

export function onBaixar(produto: ProductData, tipoEtq: 'barcode' | 'qr', linguagem: 'ZPL' | 'PPLA', cols: number): void {
  const pack = buildLabel({produto, tipoEtq, linguagem, cols});
  const text = pack.zpl || pack.ppla;
  if (text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type: pack.mime}));
    a.download = (tipoEtq === 'qr' ? `etiqueta_qr.${pack.ext}` : `etiqueta_barcode.${pack.ext}`);
    a.click();
  }
}

export async function onImprimir({produto, tipoEtq, linguagem, cols, ip}: {
  produto: ProductData;
  tipoEtq: 'barcode' | 'qr';
  linguagem: 'ZPL' | 'PPLA';
  cols: number;
  ip: string;
}): Promise<void> {
  const pack = buildLabel({produto, tipoEtq, linguagem, cols});
  const payload = (pack.zpl || pack.ppla || '').replace(/\r?\n/g, '\r\n');

  if (!ip) {
    alert('Sem IP informado. Baixei o arquivo para você imprimir pelo sistema.');
    onBaixar(produto, tipoEtq, linguagem, cols);
    return;
  }
  
  const r = await sendToPrinter({ ip, port: 9100, payload });
  if (r && r.ok) alert(`Impressão enviada para ${r.printer}`);
  else alert(`Falha ao enviar. ${r?.error || ''}`);
}