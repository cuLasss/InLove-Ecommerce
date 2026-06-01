// Utilidades para detecção automática de cores e geração de cores pastel

interface ColorMapping {
  [key: string]: string;
}

// Mapeamento expandido de nomes de cores em português para códigos hex
export const COLOR_NAMES: ColorMapping = {
  // Cores básicas
  'preto': '#000000',
  'branco': '#FFFFFF',
  'cinza': '#808080',
  'cinza escuro': '#404040',
  'cinza claro': '#D3D3D3',
  'prata': '#C0C0C0',
  
  // Vermelhos
  'vermelho': '#DC2626',
  'vinho': '#8B0000',
  'bordô': '#800020',
  'coral': '#FF7F50',
  'rosa': '#FFC0CB',
  'rosa escuro': '#C71585',
  'rosa bebê': '#FFB6C1',
  'rosa claro': '#FFCCCB',
  
  // Azuis
  'azul': '#2563EB',
  'azul marinho': '#1E3A8A',
  'azul-marinho': '#1E3A8A',
  'azul escuro': '#1E40AF',
  'azul claro': '#93C5FD',
  'azul céu': '#87CEEB',
  'turquesa': '#40E0D0',
  'ciano': '#00FFFF',
  'azul royal': '#4169E1',
  'azul petróleo': '#4682B4',
  
  // Verdes
  'verde': '#16A34A',
  'verde escuro': '#15803D',
  'verde claro': '#86EFAC',
  'verde água': '#00FA9A',
  'verde-água': '#00FA9A',
  'oliva': '#808000',
  'verde musgo': '#8FBC8F',
  'verde floresta': '#228B22',
  'menta': '#98FB98',
  
  // Amarelos
  'amarelo': '#EAB308',
  'dourado': '#FFD700',
  'mostarda': '#FFDB58',
  'bege': '#F5F5DC',
  'creme': '#FFFDD0',
  'areia': '#C2B280',
  'palha': '#F0E68C',
  
  // Laranjas
  'laranja': '#EA580C',
  'laranja escuro': '#C2410C',
  'pêssego': '#FFCBA4',
  'salmão': '#FA8072',
  'coral claro': '#F08080',
  
  // Roxos
  'roxo': '#7C3AED',
  'violeta': '#8A2BE2',
  'lilás': '#DDA0DD',
  'lavanda': '#E6E6FA',
  'púrpura': '#800080',
  'magenta': '#FF00FF',
  'uva': '#6F2DA8',
  
  // Marrons
  'marrom': '#A52A2A',
  'castanho': '#964B00',
  'caramelo': '#C68E17',
  'chocolate': '#D2691E',
  'café': '#8B4513',
  'terra': '#A0522D',
  'bronze': '#CD7F32',
  
  // Especiais
  'off white': '#FAF0E6',
  'off-white': '#FAF0E6',
  'nude': '#E3BC9A',
  'champagne': '#F7E7CE',
  'pérola': '#F8F6F0',
  'gelo': '#F0FFFF',
  'fumê': '#778899',
}

// Paleta de cores pastel sugeridas para o picker
export const PASTEL_PALETTE = [
  '#FFE4E1', // Rosa pastel
  '#E6E6FA', // Lavanda
  '#E0FFFF', // Azul claro
  '#F0FFF0', // Verde menta
  '#FFFACD', // Amarelo pastel
  '#FFE4B5', // Laranja pastel
  '#FFEFD5', // Pêssego
  '#F5F5DC', // Bege
  '#E6DDD4', // Areia
  '#D8BFD8', // Lilás
  '#B0E0E6', // Azul pó
  '#98FB98', // Verde claro
]

// Função para resolver cor a partir de string
export function resolveColor(colorInput: string): string {
  if (!colorInput || typeof colorInput !== 'string') {
    return '#e5e7eb'; // Fallback neutral
  }

  const color = colorInput.trim().toLowerCase();

  // Verificar se já é um hex válido
  if (color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)) {
    return color;
  }

  // Buscar no mapeamento de nomes
  if (COLOR_NAMES[color]) {
    return COLOR_NAMES[color];
  }

  // Buscar por palavras-chave parciais
  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    if (color.includes(name) || name.includes(color)) {
      return hex;
    }
  }

  // Gerar cor baseada no hash da string
  return generateColorFromString(colorInput);
}

// Função para gerar cor pastel estável a partir de uma string
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Gerar HSL com saturação e luminosidade controladas para tons pastel
  const hue = Math.abs(hash) % 360;
  const saturation = 45 + (Math.abs(hash >> 8) % 25); // 45-70%
  const lightness = 70 + (Math.abs(hash >> 16) % 20); // 70-90%

  return hslToHex(hue, saturation, lightness);
}

// Converter HSL para HEX
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Função para detectar cor automaticamente do nome do produto
export function detectColorFromProductName(productName: string): string | null {
  if (!productName || typeof productName !== 'string') {
    return null;
  }

  const name = productName.toLowerCase();

  // Procurar por cores conhecidas no nome do produto
  for (const [colorName, hexValue] of Object.entries(COLOR_NAMES)) {
    if (name.includes(colorName)) {
      return hexValue;
    }
  }

  return null;
}

// Função para verificar se uma cor é clara ou escura (para contraste de texto)
export function isLightColor(hexColor: string): boolean {
  if (!hexColor || !hexColor.startsWith('#')) {
    return true; // Fallback para considerar clara
  }

  const rgb = hexToRgb(hexColor);
  if (!rgb) return true;

  // Calcular luminância relativa
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

// Converter HEX para RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}