// Configurações para APIs de Nota Fiscal Eletrônica

export interface NfeApiConfig {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: 'bearer' | 'basic' | 'api-key';
  endpoints: {
    emitir: string;
    consultar: string;
    cancelar: string;
    inutilizar: string;
  };
  requiredFields: string[];
  documentation: string;
}

export const NFE_API_PROVIDERS: Record<string, NfeApiConfig> = {
  fiscal: {
    id: 'fiscal',
    name: 'Fiscal BR',
    description: 'API oficial brasileira para NF-e',
    baseUrl: 'https://api.fiscalbr.com.br',
    authType: 'bearer',
    endpoints: {
      emitir: '/nfe/emitir',
      consultar: '/nfe/consultar',
      cancelar: '/nfe/cancelar',
      inutilizar: '/nfe/inutilizar'
    },
    requiredFields: ['cnpj', 'certificado', 'senha_certificado'],
    documentation: 'https://docs.fiscalbr.com.br'
  },
  
  nfeio: {
    id: 'nfeio',
    name: 'NF-e.io',
    description: 'Solução completa para emissão de NF-e',
    baseUrl: 'https://api.nfe.io',
    authType: 'bearer',
    endpoints: {
      emitir: '/v1/nfe',
      consultar: '/v1/nfe/{id}',
      cancelar: '/v1/nfe/{id}/cancelar',
      inutilizar: '/v1/nfe/inutilizar'
    },
    requiredFields: ['api_key', 'company_id'],
    documentation: 'https://docs.nfe.io'
  },
  
  tecnospeed: {
    id: 'tecnospeed',
    name: 'TecnoSpeed',
    description: 'Integração avançada com SEFAZ',
    baseUrl: 'https://api.tecnospeed.com.br',
    authType: 'bearer',
    endpoints: {
      emitir: '/nfe/emitir',
      consultar: '/nfe/consultar',
      cancelar: '/nfe/cancelar',
      inutilizar: '/nfe/inutilizar'
    },
    requiredFields: ['cnpj', 'token', 'ambiente'],
    documentation: 'https://docs.tecnospeed.com.br'
  },
  
  local: {
    id: 'local',
    name: 'Local/Simulado',
    description: 'Para testes e desenvolvimento',
    baseUrl: 'http://localhost:3000',
    authType: 'api-key',
    endpoints: {
      emitir: '/api/nfe/emitir',
      consultar: '/api/nfe/consultar',
      cancelar: '/api/nfe/cancelar',
      inutilizar: '/api/nfe/inutilizar'
    },
    requiredFields: [],
    documentation: 'Simulação local'
  }
};

// Configurações de ambiente
export const NFE_ENVIRONMENTS = {
  homologacao: {
    id: 'homologacao',
    name: 'Homologação',
    description: 'Ambiente de testes da SEFAZ',
    tpAmb: '2',
    baseUrl: 'https://hom.nfe.fazenda.gov.br'
  },
  producao: {
    id: 'producao',
    name: 'Produção',
    description: 'Ambiente de produção da SEFAZ',
    tpAmb: '1',
    baseUrl: 'https://www.nfe.fazenda.gov.br'
  }
};

// Configurações da empresa
export const EMPRESA_NFE_CONFIG = {
  cnpj: process.env.NEXT_PUBLIC_EMPRESA_CNPJ || '',
  razaoSocial: process.env.NEXT_PUBLIC_EMPRESA_RAZAO_SOCIAL || 'IN LOVE DEMO',
  nomeFantasia: process.env.NEXT_PUBLIC_EMPRESA_NOME_FANTASIA || 'IN LOVE',
  ie: process.env.NEXT_PUBLIC_EMPRESA_IE || '',
  endereco: {
    logradouro: process.env.NEXT_PUBLIC_EMPRESA_LOGRADOURO || '',
    numero: process.env.NEXT_PUBLIC_EMPRESA_NUMERO || '',
    bairro: process.env.NEXT_PUBLIC_EMPRESA_BAIRRO || '',
    municipio: process.env.NEXT_PUBLIC_EMPRESA_MUNICIPIO || '',
    uf: process.env.NEXT_PUBLIC_EMPRESA_UF || '',
    cep: process.env.NEXT_PUBLIC_EMPRESA_CEP || '',
    telefone: process.env.NEXT_PUBLIC_EMPRESA_TELEFONE || ''
  }
};

// Função para obter token de autenticação
export const getAuthToken = (provider: string): string | null => {
  const tokens = {
    fiscal: process.env.FISCAL_API_TOKEN,
    nfeio: process.env.NFEIO_API_TOKEN,
    tecnospeed: process.env.TECNOSPEED_API_TOKEN,
    local: process.env.LOCAL_API_TOKEN
  };
  
  return tokens[provider as keyof typeof tokens] || null;
};

// Função para fazer chamada para API de NF-e
export const callNfeApi = async (
  provider: string,
  endpoint: string,
  data: any,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'
): Promise<any> => {
  const config = NFE_API_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Provedor ${provider} não encontrado`);
  }

  const token = getAuthToken(provider);
  if (!token && provider !== 'local') {
    throw new Error(`Token de autenticação não configurado para ${provider}`);
  }

  const url = `${config.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Configurar autenticação
  switch (config.authType) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${token}`;
      break;
    case 'basic':
      headers['Authorization'] = `Basic ${btoa(token)}`;
      break;
    case 'api-key':
      headers['X-API-Key'] = token || 'local-key';
      break;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API ${provider}: ${response.status} - ${errorText}`);
  }

  return await response.json();
};

// Função para emitir NF-e
export const emitirNfe = async (provider: string, nfeData: any): Promise<any> => {
  const config = NFE_API_PROVIDERS[provider];
  return await callNfeApi(provider, config.endpoints.emitir, nfeData);
};

// Função para consultar NF-e
export const consultarNfe = async (provider: string, chaveAcesso: string): Promise<any> => {
  const config = NFE_API_PROVIDERS[provider];
  const endpoint = config.endpoints.consultar.replace('{id}', chaveAcesso);
  return await callNfeApi(provider, endpoint, {}, 'GET');
};

// Função para cancelar NF-e
export const cancelarNfe = async (provider: string, chaveAcesso: string, justificativa: string): Promise<any> => {
  const config = NFE_API_PROVIDERS[provider];
  const endpoint = config.endpoints.cancelar.replace('{id}', chaveAcesso);
  return await callNfeApi(provider, endpoint, { justificativa });
};

// Função para inutilizar numeração
export const inutilizarNumeracao = async (
  provider: string, 
  serie: string, 
  numeroInicial: string, 
  numeroFinal: string, 
  justificativa: string
): Promise<any> => {
  const config = NFE_API_PROVIDERS[provider];
  return await callNfeApi(provider, config.endpoints.inutilizar, {
    serie,
    numeroInicial,
    numeroFinal,
    justificativa
  });
};

// Validações
export const validateNfeData = (nfeData: any): string[] => {
  const errors: string[] = [];
  
  if (!nfeData.emitente?.cnpj) {
    errors.push('CNPJ do emitente é obrigatório');
  }
  
  if (!nfeData.destinatario?.nome) {
    errors.push('Nome do destinatário é obrigatório');
  }
  
  if (!nfeData.itens || nfeData.itens.length === 0) {
    errors.push('Pelo menos um item é obrigatório');
  }
  
  if (!nfeData.valores?.totalNota || parseFloat(nfeData.valores.totalNota) <= 0) {
    errors.push('Valor total da nota deve ser maior que zero');
  }
  
  return errors;
};

// Formatação de dados para API
export const formatNfeDataForApi = (nfeData: any, provider: string): any => {
  const baseData = {
    ambiente: nfeData.ambiente,
    serie: nfeData.serie,
    numero: nfeData.numero,
    dataEmissao: nfeData.dataEmissao,
    emitente: nfeData.emitente,
    destinatario: nfeData.destinatario,
    itens: nfeData.itens,
    valores: nfeData.valores
  };

  // Formatação específica por provedor
  switch (provider) {
    case 'fiscal':
      return {
        ...baseData,
        certificado: process.env.FISCAL_CERTIFICADO,
        senha_certificado: process.env.FISCAL_SENHA_CERTIFICADO
      };
      
    case 'nfeio':
      return {
        ...baseData,
        company_id: process.env.NFEIO_COMPANY_ID
      };
      
    case 'tecnospeed':
      return {
        ...baseData,
        ambiente: nfeData.ambiente === 'producao' ? '1' : '2'
      };
      
    default:
      return baseData;
  }
};
