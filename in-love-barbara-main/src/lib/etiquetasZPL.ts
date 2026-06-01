/* ===========================
   ETIQUETAS — ZPL + PREVIEW + PRINT
   =========================== */

/*** LIMITES ***/
const LIMITS = {
  qr: {
    nameMax: 22,        // nome máximo para QR code
    nameMin: 1,         // nome mínimo para QR code
    supplierMax: 13,    // fornecedor máximo (incluindo espaços e números)
    supplierMin: 1,     // fornecedor mínimo
    sizeMax: 5,         // tamanho máximo
    sizeMin: 1,         // tamanho mínimo
    priceMax: 9999.99,  // preço máximo R$ 9.999,99
  },
  barcode: {
    valueLineMaxChars: 24 // "NOME PREÇO" na linha do painel B
  }
};

/*** HELPERS ***/
function stripAccents(s = ''): string { 
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); 
}

function norm(s = ''): string {
  return stripAccents(String(s))
    .toUpperCase()
    .replace(/[^\w\s\-.:\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(txt: string, max: number): string { 
  const t = norm(txt); 
  return t.length <= max ? t : t.slice(0, max); 
}

function moneyBRL(x: any): string {
  if (typeof x === 'number') {
    return x.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}).replace(/\s/g, ' ');
  }
  const t = String(x ?? '').replace(/[^\d,\.]/g, '');
  if (t.includes(',')) return 'R$ ' + t;
  const n = Number(t || 0);
  return n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}).replace(/\s/g, ' ');
}

// Armazenar timestamp da última requisição para evitar rate limit
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 segundos entre requisições

/*** LABELARY VIEWER ***/
function openLabelaryViewer(zpl: string, size: '90x12' | '90x40'): void { 
  const mm = size === '90x12' ? {w: 90, h: 12} : {w: 90, h: 40};
  // Ambos usam 8dpmm (203 DPI) conforme padrão da impressora
  const density = 8;
  
  // Adicionar parâmetros únicos para evitar cache e rate limit
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  // Calcular delay necessário para respeitar intervalo mínimo
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  const delay = timeSinceLastRequest < MIN_REQUEST_INTERVAL 
    ? MIN_REQUEST_INTERVAL - timeSinceLastRequest 
    : 0;
  
  const openUrl = () => {
    const base = `https://labelary.com/viewer.html?density=${density}&quality=bitonal&width=${mm.w}&height=${mm.h}&units=mm&index=0&rotation=0&_t=${timestamp}&_r=${random}&zpl=`;
    const url = base + encodeURIComponent(zpl);
    window.open(url, '_blank');
    lastRequestTime = Date.now();
  };
  
  if (delay > 0) {
    // Aguardar o delay necessário antes de abrir
    setTimeout(openUrl, delay);
  } else {
    // Abrir imediatamente se já passou o intervalo mínimo
    openUrl();
  }
}

/*** POSICIONAMENTO DINÂMICO DO NOME BASEADO NO NÚMERO DE CARACTERES ***/
function getNameYPosition(nameLength: number): number {
  const positions: Record<number, number> = {
    1: 150,  // 1 caractere: ^FO5,150^A0B,24,24^FDC^FS
    2: 140,  // 2 caracteres: ^FO5,140^A0B,24,24^FDCA^FS
    3: 130,  // 3 caracteres: ^FO5,130^A0B,24,24^FDCAS^FS
    4: 130,  // 4 caracteres: ^FO5,130^A0B,24,24^FDCASA^FS
    5: 130,  // 5 caracteres: ^FO5,130^A0B,24,24^FDCASAS^FS
    6: 120,  // 6 caracteres: ^FO5,120^A0B,24,24^FDCASASA^FS
    7: 110,  // 7 caracteres: ^FO5,110^A0B,24,24^FDCASASAR^FS
    8: 100,  // 8 caracteres: ^FO5,100^A0B,24,24^FDCASASARS^FS
    9: 90,   // 9 caracteres: ^FO5,90^A0B,24,24^FDCASASARSX^FS
    10: 80,  // 10 caracteres: ^FO5,80^A0B,24,24^FDCASASARSXZ^FS
    11: 85,  // 11 caracteres: ^FO5,85^A0B,24,24^FDCASASARSXZC^FS
    12: 80,  // 12 caracteres: ^FO5,80^A0B,24,24^FDCASASARSXZCF^FS
    13: 70,  // 13 caracteres: ^FO5,70^A0B,24,24^FDCASASARSXZCFG^FS
    14: 70,  // 14 caracteres: ^FO5,70^A0B,24,24^FDCASASARSXZCFGY^FS
    15: 65,  // 15 caracteres: ^FO5,65^A0B,24,24^FDCASASARSXZCFGYZ^FS
    16: 60,  // 16 caracteres: ^FO5,60^A0B,24,24^FDCASASARSXZCFGYZB^FS
    17: 50,  // 17 caracteres: ^FO5,50^A0B,24,24^FDCASASARSXZCFGYZBH^FS
    18: 42,  // 18 caracteres: ^FO5,42^A0B,24,24^FDCASASARSXZCFGYZBHV^FS
    19: 34,  // 19 caracteres: ^FO5,34^A0B,24,24^FDCASASARSXZCFGYZBHVN^FS
    20: 25,  // 20 caracteres: ^FO5,25^A0B,24,24^FDCASASARSXZCFGYZBHVNM^FS
    21: 20,  // 21 caracteres: ^FO5,20^A0B,24,24^FDCASASARSXZCFGYZBHVNMK^FS
    22: 11   // 22 caracteres: ^FO5,11^A0B,24,24^FDCASASARSXZCFGYZBHVNMKL^FS
  };
  return positions[nameLength] || 11; // valor padrão para máximo de caracteres
}

/*** POSICIONAMENTO DINÂMICO DO TAMANHO BASEADO NO NÚMERO DE CARACTERES ***/
function getSizeYPosition(sizeLength: number): number {
  const positions: Record<number, number> = {
    1: 95,   // 1 caractere: ^FO80,95^A0B,20,20^FDTAM: 3^FS
    2: 85,   // 2 caracteres: ^FO80,85^A0B,20,20^FDTAM: LU^FS
    3: 74,   // 3 caracteres: ^FO80,74^A0B,20,20^FDTAM: LUC^FS
    4: 63,   // 4 caracteres: ^FO80,63^A0B,20,20^FDTAM: LUCA^FS
    5: 52    // 5 caracteres: ^FO80,52^A0B,20,20^FDTAM: LUCAS^FS
  };
  return positions[sizeLength] || 52; // valor padrão para máximo de caracteres
}

/*** POSICIONAMENTO DINÂMICO DO FORNECEDOR BASEADO NO NÚMERO DE CARACTERES ***/
function getSupplierYPosition(supplierLength: number): number {
  const positions: Record<number, number> = {
    1: 121,  // 1 caractere: ^FO110,121^A0B,18,18^FDF: T^FS
    2: 113,  // 2 caracteres: ^FO110,113^A0B,18,18^FDF: TE^FS
    3: 103,  // 3 caracteres: ^FO110,103^A0B,18,18^FDF: TES^FS
    4: 95,   // 4 caracteres: ^FO110,95^A0B,18,18^FDF: TEST^FS
    5: 86,   // 5 caracteres: ^FO110,86^A0B,18,18^FDF: TESTE^FS
    6: 77,   // 6 caracteres: ^FO110,77^A0B,18,18^FDF: TESTES^FS
    7: 67,   // 7 caracteres: ^FO110,67^A0B,18,18^FDF: TESTESE^FS
    8: 57,   // 8 caracteres: ^FO110,57^A0B,18,18^FDF: TESTESES^FS
    9: 48,   // 9 caracteres: ^FO110,48^A0B,18,18^FDF: TESTESESE^FS
    10: 39,  // 10 caracteres: ^FO110,39^A0B,18,18^FDF: TESTESESES^FS
    11: 30,  // 11 caracteres: ^FO110,30^A0B,18,18^FDF: TESTESESESX^FS
    12: 21,  // 12 caracteres: ^FO110,21^A0B,18,18^FDF: TESTESESESXD^FS
    13: 2    // 13 caracteres: ^FO110,2^A0B,18,18^FDF: DDDDDDDDDDDDS^FS
  };
  return positions[supplierLength] || 2; // valor padrão para máximo de caracteres
}

/*** POSICIONAMENTO DINÂMICO DO PREÇO BASEADO NO NÚMERO DE DÍGITOS ***/
function getPriceYPosition(price: any): number {
  const preco = typeof price === 'number' ? price : parseFloat(price || '0');
  const integerPart = Math.floor(Math.abs(preco));
  const digits = integerPart.toString().length;
  
  const positions: Record<number, number> = {
    1: 30,  // 1 dígito: ^FO175,30^A0B,28,28^FDR$ 1,00^FS
    2: 30,  // 2 dígitos: ^FO175,30^A0B,28,28^FDR$ 10,00^FS
    3: 25,  // 3 dígitos: ^FO175,25^A0B,28,28^FDR$ 100,00^FS
    4: 20   // 4 dígitos: ^FO175,20^A0B,28,28^FDR$ 1000,00^FS
  };
  
  return positions[digits] || 20; // valor padrão para 4+ dígitos
}

/*** ZPL — QR 40×30 (3 colunas, deitado) seguindo padrão Labelary 8dpmm ***/
function buildZPL_QR_4030(product: any): string {
  const N = clamp(product?.nome ?? '', LIMITS.qr.nameMax);
  const Rf = norm(product?.ref || product?.codigo128 || '');
  const Tm = clamp(product?.tam || '', LIMITS.qr.sizeMax);
  const Fr = clamp(product?.fornecedor || 'SEM FORNECEDOR', LIMITS.qr.supplierMax);
  const P = moneyBRL(product?.preco);
  const URL = product?.url_qr || '';

  // Debug: verificar dados do fornecedor no ZPL
  console.log('🏷️ [ZPL] Debug do fornecedor:', {
    productNome: product?.nome,
    fornecedorOriginal: product?.fornecedor,
    fornecedorClamped: Fr,
    fornecedorLength: Fr.length,
    supplierMax: LIMITS.qr.supplierMax,
    fornecedorIsDefault: Fr === 'SEM FORNECEDOR'
  });

  // Validar limites de preço
  const preco = typeof product?.preco === 'number' ? product.preco : parseFloat(product?.preco || '0');
  if (preco > LIMITS.qr.priceMax) {
    console.warn(`Preço ${preco} excede o limite máximo de R$ ${LIMITS.qr.priceMax}`);
  }

  // Calcular posições Y dinâmicas baseadas no número de caracteres
  const nameY = getNameYPosition(N.length);
  const sizeY = getSizeYPosition(Tm.length);
  const supplierY = getSupplierYPosition(Fr.length);
  const priceY = getPriceYPosition(product?.preco);

  return [
    '^XA',
    '^CI28',
    '^PW719',
    '^LL320',
    '^LS0',
    '^LH0,0',
    '^FWR',
    '',
    // Primeira etiqueta (30mm)
    `^FO5,${nameY}^A0B,24,24^FD${N}^FS`,
    `^FO50,45^A0B,20,20^FDCOD: ${Rf}^FS`,
    `^FO80,${sizeY}^A0B,20,20^FDTAM: ${Tm}^FS`,
    `^FO110,${supplierY}^A0B,18,18^FDF: ${Fr}^FS`,
    `^FO50,150^BQB,2,5^FDQA,${URL}^FS`,
    `^FO175,${priceY}^A0B,28,28^FD${P}^FS`,
    '',
    // Segunda etiqueta (60mm)
    `^FO260,${nameY}^A0B,24,24^FD${N}^FS`,
    `^FO300,45^A0B,20,20^FDCOD: ${Rf}^FS`,
    `^FO330,${sizeY}^A0B,20,20^FDTAM: ${Tm}^FS`,
    `^FO360,${supplierY}^A0B,18,18^FDF: ${Fr}^FS`,
    `^FO300,150^BQB,2,5^FDQA,${URL}^FS`,
    `^FO420,${priceY}^A0B,28,28^FD${P}^FS`,
    '',
    // Terceira etiqueta (90mm)
    `^FO530,${nameY}^A0B,24,24^FD${N}^FS`,
    `^FO570,45^A0B,20,20^FDCOD: ${Rf}^FS`,
    `^FO600,${sizeY}^A0B,20,20^FDTAM: ${Tm}^FS`,
    `^FO630,${supplierY}^A0B,18,18^FDF: ${Fr}^FS`,
    `^FO570,150^BQB,2,5^FDQA,${URL}^FS`,
    `^FO694,${priceY}^A0B,28,28^FD${P}^FS`,
    '',
    '^XZ'
  ].join('\n');
}

/*** ZPL — Código de Barras 90×12mm com novo layout ***/
function buildZPL_Barcode_9012(product: any): string {
  const nome = clamp(product?.nome ?? '', 30);
  const categoria = norm(product?.fornecedor || product?.categoria || 'SEM FORNECEDOR');
  const preco = moneyBRL(product?.preco);
  const code = norm(product?.codigo128 || product?.ref || '');

  return [
    '^XA',
    '^CI28',
    '^PW719',
    '^LL96',
    '^LH0,0',
    '^LS0',
    '',
    `^FO70,35`,
    `^A0N,20,20`,
    `^FB220,10,0,L,0`,
    `^FD${nome}\\&^FS`,
    '',
    `^FO165,60`,
    `^A0N,24,24`,
    `^FB220,1,0,L,0`,
    `^FD${preco}\\&^FS`,
    '',
    `^FO75,60`,
    `^A0N,23,23`,
    `^FB220,1,0,L,0`,
    `^FD${categoria}\\&^FS`,
    '',
    `^BY2,2,40`,
    `^FO315,25^BCN,40,N,N,N^FD${code}^FS`,
    '',
    `^FO265,75`,
    `^A0N,18,18`,
    `^FB280,1,0,C,0`,
    `^FD${code}\\&^FS`,
    '',
    '^XZ'
  ].join('\n');
}

/*** ROUTER ***/
function buildZPL(product: any, tipo: 'qrcode' | 'barcode'): string {
  return (tipo === 'qrcode')
    ? buildZPL_QR_4030(product)
    : buildZPL_Barcode_9012(product);
}

/*** VISUALIZAR IMPRESSÃO (abre Labelary) ***/
export function onVisualizarImpressao(product: any, tipo: 'qrcode' | 'barcode'): string {
  const zpl = buildZPL(product, tipo);
  const size = (tipo === 'qrcode') ? '90x40' : '90x12';
  openLabelaryViewer(zpl, size);
  return zpl;
}

/*** IMPRESSÃO — Zebra BrowserPrint ***/
async function pickBrowserPrintDevice(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!(window as any).BrowserPrint) {
      return reject(new Error('Instale o Zebra BrowserPrint'));
    }
    
    (window as any).BrowserPrint.getLocalDevices((devs: any[]) => {
      const printers = devs.filter(d => d.deviceType === 'printer');
      if (!printers.length) {
        return reject(new Error('Nenhuma impressora ZPL encontrada'));
      }
      
      // picker simples — substitua por select se quiser
      const nomes = printers.map((p, i) => `${i + 1}) ${p.name || 'Impressora'}`).join('\n');
      const idx = Number(prompt('Selecione a impressora:\n' + nomes)) - 1;
      const sel = printers[idx];
      
      if (!sel) {
        return reject(new Error('Seleção inválida'));
      }
      
      resolve(sel);
    }, (err: any) => reject(err), 'printer');
  });
}

async function sendToBrowserPrint(device: any, zpl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      device.send(zpl, () => resolve(device.name || 'Impressora'), (err: any) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

/*** Handler do botão IMPRIMIR ***/
export async function onImprimir(product: any, tipo: 'qrcode' | 'barcode'): Promise<boolean> {
  try {
    const zpl = buildZPL(product, tipo);
    const dev = await pickBrowserPrintDevice();
    const used = await sendToBrowserPrint(dev, zpl);
    alert(`Impressão enviada a ${used}`);
    return true;
  } catch (e: any) {
    alert('Erro ao imprimir: ' + e.message);
    return false;
  }
}

// Exporte para o ambiente global (se necessário):
if (typeof window !== 'undefined') {
  (window as any).onVisualizarImpressao = onVisualizarImpressao;
  (window as any).onImprimir = onImprimir;
}