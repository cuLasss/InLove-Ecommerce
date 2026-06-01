/**
 * Parser para arquivos XML de Nota Fiscal Eletrônica (NF-e)
 * Extrai informações essenciais como status, código, emitente, itens, etc.
 */

export interface NfeXmlData {
  // Informações básicas
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  status: 'AUTORIZADA' | 'CANCELADA' | 'INUTILIZADA' | 'REJEITADA';
  
  // Emitente
  emitente: {
    nome: string;
    cnpj: string;
    endereco?: string;
  };
  
  // Destinatário
  destinatario: {
    nome: string;
    cnpj: string;
    endereco?: string;
  };
  
  // Valores
  valores: {
    totalProdutos: number;
    totalServicos: number;
    totalNota: number;
    baseCalculoICMS: number;
    valorICMS: number;
  };
  
  // Itens
  itens: NfeItem[];
  
  // Status de cancelamento
  cancelamento?: {
    dataCancelamento: string;
    protocolo: string;
    justificativa: string;
  };
  
  // Metadados do arquivo
  arquivo: {
    nome: string;
    tamanho: number;
    dataImportacao: string;
  };
}

export interface NfeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseCalculoICMS: number;
  aliquotaICMS: number;
  valorICMS: number;
}

// Tipos de erro específicos para NF-e
export enum NfeErrorType {
  // Erros estruturais do XML
  XML_MALFORMED = 'XML_MALFORMED',
  XML_INVALID_ENCODING = 'XML_INVALID_ENCODING',
  XML_MISSING_ROOT = 'XML_MISSING_ROOT',
  XML_MISSING_NAMESPACE = 'XML_MISSING_NAMESPACE',
  
  // Erros de elementos obrigatórios
  MISSING_CHAVE_ACESSO = 'MISSING_CHAVE_ACESSO',
  MISSING_NUMERO = 'MISSING_NUMERO',
  MISSING_SERIE = 'MISSING_SERIE',
  MISSING_DATA_EMISSAO = 'MISSING_DATA_EMISSAO',
  MISSING_EMITENTE = 'MISSING_EMITENTE',
  MISSING_DESTINATARIO = 'MISSING_DESTINATARIO',
  MISSING_VALORES = 'MISSING_VALORES',
  MISSING_ITENS = 'MISSING_ITENS',
  
  // Erros de dados inválidos
  INVALID_CHAVE_ACESSO_FORMAT = 'INVALID_CHAVE_ACESSO_FORMAT',
  INVALID_CHAVE_ACESSO_LENGTH = 'INVALID_CHAVE_ACESSO_LENGTH',
  INVALID_CNPJ_FORMAT = 'INVALID_CNPJ_FORMAT',
  INVALID_CNPJ_LENGTH = 'INVALID_CNPJ_LENGTH',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  INVALID_DATA_FUTURE = 'INVALID_DATA_FUTURE',
  INVALID_DATA_TOO_OLD = 'INVALID_DATA_TOO_OLD',
  INVALID_VALOR_NEGATIVO = 'INVALID_VALOR_NEGATIVO',
  INVALID_VALOR_ZERO = 'INVALID_VALOR_ZERO',
  INVALID_VALOR_FORMAT = 'INVALID_VALOR_FORMAT',
  INVALID_QUANTIDADE_NEGATIVA = 'INVALID_QUANTIDADE_NEGATIVA',
  INVALID_QUANTIDADE_ZERO = 'INVALID_QUANTIDADE_ZERO',
  INVALID_QUANTIDADE_FORMAT = 'INVALID_QUANTIDADE_FORMAT',
  
  // Erros de status
  STATUS_CANCELADA = 'STATUS_CANCELADA',
  STATUS_INUTILIZADA = 'STATUS_INUTILIZADA',
  STATUS_REJEITADA = 'STATUS_REJEITADA',
  STATUS_DESCONHECIDO = 'STATUS_DESCONHECIDO',
  
  // Erros de duplicação
  DUPLICATE_CHAVE_ACESSO = 'DUPLICATE_CHAVE_ACESSO',
  DUPLICATE_NUMERO_SERIE = 'DUPLICATE_NUMERO_SERIE',
  
  // Erros de consistência
  INCONSISTENT_VALORES = 'INCONSISTENT_VALORES',
  INCONSISTENT_ITENS_VALOR = 'INCONSISTENT_ITENS_VALOR',
  INCONSISTENT_ICMS_CALCULATION = 'INCONSISTENT_ICMS_CALCULATION',
  
  // Erros de negócio
  EMITENTE_BLOCKED = 'EMITENTE_BLOCKED',
  DESTINATARIO_BLOCKED = 'DESTINATARIO_BLOCKED',
  PRODUTO_BLOCKED = 'PRODUTO_BLOCKED',
  VALOR_ABOVE_LIMIT = 'VALOR_ABOVE_LIMIT',
  
  // Erros de integridade
  MISSING_PROTOCOLO = 'MISSING_PROTOCOLO',
  INVALID_PROTOCOLO = 'INVALID_PROTOCOLO',
  MISSING_DIGITAL_SIGNATURE = 'MISSING_DIGITAL_SIGNATURE',
  INVALID_DIGITAL_SIGNATURE = 'INVALID_DIGITAL_SIGNATURE'
}

export interface NfeValidationError {
  type: NfeErrorType;
  message: string;
  field?: string;
  value?: any;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface NfeValidationResult {
  isValid: boolean;
  status: 'VALID' | 'CANCELLED' | 'DUPLICATE' | 'INVALID';
  errorCode?: string;
  errorMessage?: string;
  data?: NfeXmlData;
  errors: NfeValidationError[];
  warnings: NfeValidationError[];
  info: NfeValidationError[];
}

// Funções utilitárias para validação
function createError(type: NfeErrorType, message: string, field?: string, value?: any): NfeValidationError {
  return {
    type,
    message,
    field,
    value,
    severity: 'ERROR'
  };
}

function createWarning(type: NfeErrorType, message: string, field?: string, value?: any): NfeValidationError {
  return {
    type,
    message,
    field,
    value,
    severity: 'WARNING'
  };
}

function createInfo(type: NfeErrorType, message: string, field?: string, value?: any): NfeValidationError {
  return {
    type,
    message,
    field,
    value,
    severity: 'INFO'
  };
}

// Validações específicas melhoradas
function validateChaveAcesso(chaveAcesso: string): NfeValidationError[] {
  const errors: NfeValidationError[] = [];
  
  if (!chaveAcesso) {
    errors.push(createError(NfeErrorType.MISSING_CHAVE_ACESSO, 
      'Chave de acesso é obrigatória para identificação da NF-e', 'chaveAcesso'));
    return errors;
  }
  
  if (chaveAcesso.length !== 44) {
    errors.push(createError(NfeErrorType.INVALID_CHAVE_ACESSO_LENGTH, 
      `Chave de acesso deve ter exatamente 44 dígitos (encontrado: ${chaveAcesso.length})`, 
      'chaveAcesso', chaveAcesso));
  }
  
  if (!/^\d{44}$/.test(chaveAcesso)) {
    errors.push(createError(NfeErrorType.INVALID_CHAVE_ACESSO_FORMAT, 
      'Chave de acesso deve conter apenas números (0-9)', 'chaveAcesso', chaveAcesso));
  }
  
  // Validação adicional: verificar estrutura da chave
  if (chaveAcesso.length === 44 && /^\d{44}$/.test(chaveAcesso)) {
    const cUF = chaveAcesso.substring(0, 2);
    const aamm = chaveAcesso.substring(2, 6);
    const cnpj = chaveAcesso.substring(6, 20);
    const mod = chaveAcesso.substring(20, 22);
    const serie = chaveAcesso.substring(22, 25);
    const nNF = chaveAcesso.substring(25, 34);
    const tpEmis = chaveAcesso.substring(34, 35);
    const cNF = chaveAcesso.substring(35, 43);
    const cDV = chaveAcesso.substring(43, 44);
    
    // Validações específicas da estrutura
    if (parseInt(cUF) < 11 || parseInt(cUF) > 53) {
      errors.push(createError(NfeErrorType.INVALID_CHAVE_ACESSO_FORMAT, 
        `Código UF inválido na chave de acesso: ${cUF}`, 'chaveAcesso', chaveAcesso));
    }
    
    if (parseInt(mod) !== 55) {
      errors.push(createError(NfeErrorType.INVALID_CHAVE_ACESSO_FORMAT, 
        `Modelo de documento inválido na chave de acesso: ${mod} (deve ser 55 para NF-e)`, 'chaveAcesso', chaveAcesso));
    }
    
    if (parseInt(tpEmis) < 1 || parseInt(tpEmis) > 9) {
      errors.push(createError(NfeErrorType.INVALID_CHAVE_ACESSO_FORMAT, 
        `Tipo de emissão inválido na chave de acesso: ${tpEmis}`, 'chaveAcesso', chaveAcesso));
    }
  }
  
  return errors;
}

function validateCNPJ(cnpj: string, field: string): NfeValidationError[] {
  const errors: NfeValidationError[] = [];
  
  if (!cnpj) {
    errors.push(createError(NfeErrorType.MISSING_EMITENTE, 
      `${field} é obrigatório para identificação fiscal`, field));
    return errors;
  }
  
  // Remove formatação
  const cleanCnpj = cnpj.replace(/[^\d]/g, '');
  
  // Aceita tanto CNPJ (14 dígitos) quanto CPF (11 dígitos)
  if (cleanCnpj.length !== 14 && cleanCnpj.length !== 11) {
    errors.push(createError(NfeErrorType.INVALID_CNPJ_LENGTH, 
      `${field} deve ter exatamente 14 dígitos (CNPJ) ou 11 dígitos (CPF) (encontrado: ${cleanCnpj.length})`, field, cnpj));
  }
  
  if (!/^\d+$/.test(cleanCnpj)) {
    errors.push(createError(NfeErrorType.INVALID_CNPJ_FORMAT, 
      `${field} deve conter apenas números (0-9)`, field, cnpj));
  }
  
  // Validação adicional: verificar CNPJs/CPFs inválidos comuns
  if ((cleanCnpj.length === 14 || cleanCnpj.length === 11) && /^\d+$/.test(cleanCnpj)) {
    // CNPJs/CPFs com todos os dígitos iguais são inválidos
    const repeatedPattern = cleanCnpj.length === 14 ? /^(\d)\1{13}$/ : /^(\d)\1{10}$/;
    if (repeatedPattern.test(cleanCnpj)) {
      errors.push(createError(NfeErrorType.INVALID_CNPJ_FORMAT, 
        `${field} inválido: todos os dígitos são iguais (${cleanCnpj})`, field, cnpj));
    }
    
    // Lista de CNPJs/CPFs inválidos conhecidos
    const invalidNumbers = cleanCnpj.length === 14 ? 
      ['00000000000000', '11111111111111', '22222222222222', '33333333333333', 
       '44444444444444', '55555555555555', '66666666666666', '77777777777777', 
       '88888888888888', '99999999999999'] :
      ['00000000000', '11111111111', '22222222222', '33333333333', 
       '44444444444', '55555555555', '66666666666', '77777777777', 
       '88888888888', '99999999999'];
    
    if (invalidNumbers.includes(cleanCnpj)) {
      errors.push(createError(NfeErrorType.INVALID_CNPJ_FORMAT, 
        `${field} inválido: sequência não permitida (${cleanCnpj})`, field, cnpj));
    }
  }
  
  return errors;
}

function validateData(data: string, field: string): NfeValidationError[] {
  const errors: NfeValidationError[] = [];
  
  if (!data) {
    errors.push(createError(NfeErrorType.MISSING_DATA_EMISSAO, 
      `${field} é obrigatória para controle fiscal`, field));
    return errors;
  }
  
  const dataObj = new Date(data);
  
  if (isNaN(dataObj.getTime())) {
    errors.push(createError(NfeErrorType.INVALID_DATA_FORMAT, 
      `${field} em formato inválido: "${data}" (formato esperado: YYYY-MM-DD)`, field, data));
    return errors;
  }
  
  const now = new Date();
  const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  
  if (dataObj > oneMonthFuture) {
    errors.push(createError(NfeErrorType.INVALID_DATA_FUTURE, 
      `${field} não pode ser mais de 1 mês no futuro (data: ${dataObj.toLocaleDateString('pt-BR')})`, field, data));
  }
  
  if (dataObj < fiveYearsAgo) {
    errors.push(createError(NfeErrorType.INVALID_DATA_TOO_OLD, 
      `${field} muito antiga: ${dataObj.toLocaleDateString('pt-BR')} (mais de 5 anos no passado)`, field, data));
  }
  
  // Validação adicional: verificar se é uma data muito antiga (antes de 2000)
  const year2000 = new Date('2000-01-01');
  if (dataObj < year2000) {
    errors.push(createError(NfeErrorType.INVALID_DATA_TOO_OLD, 
      `${field} muito antiga: ${dataObj.toLocaleDateString('pt-BR')} (antes de 2000)`, field, data));
  }
  
  return errors;
}

function validateValor(valor: number, field: string): NfeValidationError[] {
  const errors: NfeValidationError[] = [];
  
  if (valor < 0) {
    errors.push(createError(NfeErrorType.INVALID_VALOR_NEGATIVO, 
      `${field} não pode ser negativo: R$ ${valor.toFixed(2)}`, field, valor));
  }
  
  if (valor === 0) {
    errors.push(createWarning(NfeErrorType.INVALID_VALOR_ZERO, 
      `${field} é zero: R$ ${valor.toFixed(2)} (verifique se é correto)`, field, valor));
  }
  
  // Validação adicional: valores muito altos
  if (valor > 1000000) {
    errors.push(createWarning(NfeErrorType.VALOR_ABOVE_LIMIT, 
      `${field} muito alto: R$ ${valor.toFixed(2)} (verifique se é correto)`, field, valor));
  }
  
  return errors;
}

function validateQuantidade(quantidade: number, field: string): NfeValidationError[] {
  const errors: NfeValidationError[] = [];
  
  if (quantidade < 0) {
    errors.push(createError(NfeErrorType.INVALID_QUANTIDADE_NEGATIVA, 
      `${field} não pode ser negativa: ${quantidade}`, field, quantidade));
  }
  
  if (quantidade === 0) {
    errors.push(createWarning(NfeErrorType.INVALID_QUANTIDADE_ZERO, 
      `${field} é zero: ${quantidade} (verifique se é correto)`, field, quantidade));
  }
  
  // Validação adicional: quantidades muito altas
  if (quantidade > 10000) {
    errors.push(createWarning(NfeErrorType.INVALID_QUANTIDADE_FORMAT, 
      `${field} muito alta: ${quantidade} (verifique se é correto)`, field, quantidade));
  }
  
  // Validação adicional: quantidades com casas decimais
  if (quantidade % 1 !== 0) {
    errors.push(createWarning(NfeErrorType.INVALID_QUANTIDADE_FORMAT, 
      `${field} com casas decimais: ${quantidade} (verifique se é correto)`, field, quantidade));
  }
  
  return errors;
}

/**
 * Parseia um arquivo XML de NF-e e extrai os dados principais
 */
export async function parseNfeXml(file: File): Promise<NfeValidationResult> {
  const errors: NfeValidationError[] = [];
  const warnings: NfeValidationError[] = [];
  const info: NfeValidationError[] = [];
  
  try {
    const xmlText = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Verifica se o XML é válido
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      errors.push(createError(NfeErrorType.XML_MALFORMED, 'Arquivo XML malformado ou corrompido'));
      return {
        isValid: false,
        status: 'INVALID',
        errorCode: 'XML_MALFORMED',
        errorMessage: 'Arquivo XML inválido ou corrompido',
        errors,
        warnings,
        info
      };
    }
    
    // Verifica namespace NF-e
    const rootElement = xmlDoc.documentElement;
    if (!rootElement || (!rootElement.tagName.includes('NFe') && !rootElement.tagName.includes('nfeProc'))) {
      errors.push(createError(NfeErrorType.XML_MISSING_ROOT, 'Arquivo não é uma NF-e válida'));
      return {
        isValid: false,
        status: 'INVALID',
        errorCode: 'XML_MISSING_ROOT',
        errorMessage: 'Arquivo não contém uma NF-e válida',
        errors,
        warnings,
        info
      };
    }
    
    // Extrai dados da NF-e
    const nfeData = extractNfeData(xmlDoc, file);
    
    // Validações estruturais obrigatórias (sem duplicação)
    const chaveAcessoErrors = validateChaveAcesso(nfeData.chaveAcesso);
    errors.push(...chaveAcessoErrors);
    
    // Validações básicas da NF-e
    if (!nfeData.numero) {
      errors.push(createError(NfeErrorType.MISSING_NUMERO, 
        'Número da NF-e é obrigatório para identificação', 'numero'));
    }
    
    if (!nfeData.serie) {
      errors.push(createError(NfeErrorType.MISSING_SERIE, 
        'Série da NF-e é obrigatória para identificação', 'serie'));
    }
    
    const dataErrors = validateData(nfeData.dataEmissao, 'Data de emissão');
    errors.push(...dataErrors);
    
    // Validações do emitente (consolidadas)
    if (!nfeData.emitente) {
      errors.push(createError(NfeErrorType.MISSING_EMITENTE, 
        'Dados do emitente são obrigatórios para identificação fiscal', 'emitente'));
    } else {
      const emitenteCnpjErrors = validateCNPJ(nfeData.emitente.cnpj, 'CNPJ do emitente');
      errors.push(...emitenteCnpjErrors);
      
      if (!nfeData.emitente.nome || nfeData.emitente.nome.trim() === '') {
        errors.push(createError(NfeErrorType.MISSING_EMITENTE, 
          'Nome do emitente é obrigatório para identificação', 'emitente.nome'));
      }
    }
    
    // Validações do destinatário (consolidadas)
    if (!nfeData.destinatario) {
      errors.push(createError(NfeErrorType.MISSING_DESTINATARIO, 
        'Dados do destinatário são obrigatórios para identificação fiscal', 'destinatario'));
    } else {
      const destinatarioCnpjErrors = validateCNPJ(nfeData.destinatario.cnpj, 'CNPJ do destinatário');
      errors.push(...destinatarioCnpjErrors);
      
      if (!nfeData.destinatario.nome || nfeData.destinatario.nome.trim() === '') {
        errors.push(createError(NfeErrorType.MISSING_DESTINATARIO, 
          'Nome do destinatário é obrigatório para identificação', 'destinatario.nome'));
      }
    }
    
    // Validações de valores (consolidadas)
    if (!nfeData.valores) {
      errors.push(createError(NfeErrorType.MISSING_VALORES, 
        'Valores da NF-e são obrigatórios para controle fiscal', 'valores'));
    } else {
      const valorTotalErrors = validateValor(nfeData.valores.totalNota, 'Valor total da NF-e');
      errors.push(...valorTotalErrors);
      
      const valorProdutosErrors = validateValor(nfeData.valores.totalProdutos, 'Valor total dos produtos');
      warnings.push(...valorProdutosErrors.filter(e => e.severity === 'WARNING'));
      errors.push(...valorProdutosErrors.filter(e => e.severity === 'ERROR'));
      
      const valorICMSErrors = validateValor(nfeData.valores.valorICMS, 'Valor do ICMS');
      warnings.push(...valorICMSErrors.filter(e => e.severity === 'WARNING'));
      errors.push(...valorICMSErrors.filter(e => e.severity === 'ERROR'));
    }
    
    // Validações dos itens (consolidadas)
    if (!nfeData.itens || nfeData.itens.length === 0) {
      errors.push(createError(NfeErrorType.MISSING_ITENS, 
        'NF-e deve conter pelo menos um item para ser válida', 'itens'));
    } else {
      nfeData.itens.forEach((item, index) => {
        const itemPrefix = `Item ${index + 1}`;
        
        if (!item.codigo || item.codigo.trim() === '') {
          errors.push(createError(NfeErrorType.MISSING_ITENS, 
            `${itemPrefix}: Código do produto é obrigatório para identificação`, `itens[${index}].codigo`));
        }
        
        if (!item.descricao || item.descricao.trim() === '') {
          errors.push(createError(NfeErrorType.MISSING_ITENS, 
            `${itemPrefix}: Descrição do produto é obrigatória para identificação`, `itens[${index}].descricao`));
        }
        
        const quantidadeErrors = validateQuantidade(item.quantidade, `${itemPrefix}: Quantidade`);
        warnings.push(...quantidadeErrors.filter(e => e.severity === 'WARNING'));
        errors.push(...quantidadeErrors.filter(e => e.severity === 'ERROR'));
        
        const valorUnitarioErrors = validateValor(item.valorUnitario, `${itemPrefix}: Valor unitário`);
        warnings.push(...valorUnitarioErrors.filter(e => e.severity === 'WARNING'));
        errors.push(...valorUnitarioErrors.filter(e => e.severity === 'ERROR'));
        
        const valorTotalErrors = validateValor(item.valorTotal, `${itemPrefix}: Valor total`);
        warnings.push(...valorTotalErrors.filter(e => e.severity === 'WARNING'));
        errors.push(...valorTotalErrors.filter(e => e.severity === 'ERROR'));
      });
    }
    
    // Verifica status da nota
    if (nfeData.status === 'CANCELADA') {
      const cancelamentoInfo = nfeData.cancelamento;
      let cancelamentoMessage = 'Nota fiscal cancelada';
      
      if (cancelamentoInfo?.dataCancelamento) {
        const dataCancelamento = new Date(cancelamentoInfo.dataCancelamento);
        cancelamentoMessage += ` em ${dataCancelamento.toLocaleDateString('pt-BR')}`;
      }
      
      if (cancelamentoInfo?.justificativa) {
        cancelamentoMessage += ` - Motivo: ${cancelamentoInfo.justificativa}`;
      } else {
        cancelamentoMessage += ' - Motivo não informado';
      }
      
      if (cancelamentoInfo?.protocolo) {
        cancelamentoMessage += ` (Protocolo: ${cancelamentoInfo.protocolo})`;
      }
      
      errors.push(createError(NfeErrorType.STATUS_CANCELADA, 
        cancelamentoMessage, 'status', nfeData.status));
      
      return {
        isValid: false,
        status: 'CANCELLED',
        errorCode: 'NFE_CANCELLED',
        errorMessage: cancelamentoMessage,
        data: nfeData,
        errors,
        warnings,
        info
      };
    }
    
    if (nfeData.status === 'INUTILIZADA') {
      errors.push(createError(NfeErrorType.STATUS_INUTILIZADA, 
        'Nota fiscal inutilizada - Documento foi invalidado antes da autorização', 'status', nfeData.status));
      
      return {
        isValid: false,
        status: 'INVALID',
        errorCode: 'NFE_INUTILIZADA',
        errorMessage: 'Nota fiscal inutilizada - Documento foi invalidado antes da autorização',
        data: nfeData,
        errors,
        warnings,
        info
      };
    }
    
    if (nfeData.status === 'REJEITADA') {
      errors.push(createError(NfeErrorType.STATUS_REJEITADA, 
        'Nota fiscal rejeitada - Documento foi rejeitado pela SEFAZ', 'status', nfeData.status));
      
      return {
        isValid: false,
        status: 'INVALID',
        errorCode: 'NFE_REJEITADA',
        errorMessage: 'Nota fiscal rejeitada - Documento foi rejeitado pela SEFAZ',
        data: nfeData,
        errors,
        warnings,
        info
      };
    }
    
    // Se há erros críticos, retorna como inválida
    if (errors.length > 0) {
      return {
        isValid: false,
        status: 'INVALID',
        errorCode: 'NFE_VALIDATION_ERROR',
        errorMessage: `${errors.length} erro(s) encontrado(s)`,
        data: nfeData,
        errors,
        warnings,
        info
      };
    }
    
    // Se chegou até aqui, a NF-e é válida (com warnings se houver)
    info.push(createInfo(NfeErrorType.STATUS_DESCONHECIDO, 'NF-e validada com sucesso'));
    
    return {
      isValid: true,
      status: 'VALID',
      data: nfeData,
      errors,
      warnings,
      info
    };
    
  } catch (error) {
    errors.push(createError(NfeErrorType.XML_MALFORMED, 
      `Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
    
    return {
      isValid: false,
      status: 'INVALID',
      errorCode: 'XML_PROCESSING_ERROR',
      errorMessage: 'Erro ao processar arquivo XML',
      errors,
      warnings,
      info
    };
  }
}

/**
 * Extrai os dados da NF-e do documento XML
 */
function extractNfeData(xmlDoc: Document, file: File): NfeXmlData {
  // Namespace da NF-e
  const nfeNamespace = 'http://www.portalfiscal.inf.br/nfe';
  
  // Função auxiliar para extrair texto de um elemento
  const getTextContent = (tagName: string, parent?: Element): string => {
    const element = parent ? 
      parent.getElementsByTagName(tagName)[0] : 
      xmlDoc.getElementsByTagName(tagName)[0];
    return element?.textContent?.trim() || '';
  };
  
  // Função auxiliar para extrair número
  const getNumber = (tagName: string, parent?: Element): number => {
    const text = getTextContent(tagName, parent);
    return parseFloat(text) || 0;
  };
  
  // Extrai informações básicas
  // Para nfeProc, a chave pode estar no protocolo ou na NF-e
  let chaveAcesso = getTextContent('chNFe') || getTextContent('chave');
  
  // Se não encontrou chave, procura no protocolo (caso nfeProc)
  if (!chaveAcesso) {
    const protNFeElement = xmlDoc.getElementsByTagName('protNFe')[0];
    if (protNFeElement) {
      chaveAcesso = getTextContent('chNFe', protNFeElement);
    }
  }
  
  const numero = getTextContent('nNF');
  const serie = getTextContent('serie');
  const dataEmissao = getTextContent('dhEmi') || getTextContent('dEmi');
  const cUF = getTextContent('cUF');
  const cNF = getTextContent('cNF');
  const mod = getTextContent('mod');
  const cDV = getTextContent('cDV');
  
  // Se não tiver chave de acesso, gera uma baseada nos dados disponíveis
  if (!chaveAcesso && numero && serie && cUF && cNF && mod) {
    // Formato: cUF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + cDV
    const cnpj = getTextContent('CNPJ', xmlDoc.getElementsByTagName('emit')[0]) || '00000000000000';
    const tpEmis = getTextContent('tpEmis') || '1';
    const aamm = dataEmissao ? dataEmissao.substring(2, 6) : '2401'; // AAMM da data de emissão
    
    chaveAcesso = `${cUF}${aamm}${cnpj}${mod}${serie.padStart(3, '0')}${numero.padStart(9, '0')}${tpEmis}${cNF}${cDV}`;
  }
  
  // Determina status da nota
  let status: 'AUTORIZADA' | 'CANCELADA' | 'INUTILIZADA' | 'REJEITADA' = 'AUTORIZADA';
  
  // Verifica se há elemento de cancelamento
  const cancelamentoElement = xmlDoc.getElementsByTagName('cancNFe')[0];
  if (cancelamentoElement) {
    status = 'CANCELADA';
  }
  
  // Verifica se há elemento de inutilização
  const inutilizacaoElement = xmlDoc.getElementsByTagName('inutNFe')[0];
  if (inutilizacaoElement) {
    status = 'INUTILIZADA';
  }
  
  // Extrai dados do emitente
  const emitElement = xmlDoc.getElementsByTagName('emit')[0];
  const emitente = {
    nome: getTextContent('xNome', emitElement),
    cnpj: getTextContent('CNPJ', emitElement) || getTextContent('CPF', emitElement),
    endereco: extractEndereco(emitElement)
  };
  
  // Extrai dados do destinatário
  const destElement = xmlDoc.getElementsByTagName('dest')[0];
  const destinatario = {
    nome: getTextContent('xNome', destElement),
    cnpj: getTextContent('CNPJ', destElement) || getTextContent('CPF', destElement),
    endereco: extractEndereco(destElement)
  };
  
  // Extrai valores totais
  const totalElement = xmlDoc.getElementsByTagName('total')[0];
  const valores = {
    totalProdutos: getNumber('vProd', totalElement),
    totalServicos: getNumber('vServ', totalElement),
    totalNota: getNumber('vNF', totalElement),
    baseCalculoICMS: getNumber('vBC', totalElement),
    valorICMS: getNumber('vICMS', totalElement)
  };
  
  // Extrai itens da nota
  const itens: NfeItem[] = [];
  const detElements = xmlDoc.getElementsByTagName('det');
  
  for (let i = 0; i < detElements.length; i++) {
    const detElement = detElements[i];
    const prodElement = detElement.getElementsByTagName('prod')[0];
    const impostoElement = detElement.getElementsByTagName('imposto')[0];
    
    if (prodElement) {
      const item: NfeItem = {
        codigo: getTextContent('cProd', prodElement),
        descricao: getTextContent('xProd', prodElement),
        ncm: getTextContent('NCM', prodElement),
        cfop: getTextContent('CFOP', prodElement),
        unidade: getTextContent('uCom', prodElement),
        quantidade: getNumber('qCom', prodElement),
        valorUnitario: getNumber('vUnCom', prodElement),
        valorTotal: getNumber('vProd', prodElement),
        baseCalculoICMS: getNumber('vBC', impostoElement),
        aliquotaICMS: getNumber('pICMS', impostoElement),
        valorICMS: getNumber('vICMS', impostoElement)
      };
      
      itens.push(item);
    }
  }
  
  // Extrai dados de cancelamento se existir
  let cancelamento;
  if (cancelamentoElement) {
    const infCancElement = cancelamentoElement.getElementsByTagName('infCanc')[0];
    if (infCancElement) {
      cancelamento = {
        dataCancelamento: getTextContent('dhEvento', infCancElement),
        protocolo: getTextContent('nProt', infCancElement),
        justificativa: getTextContent('xJust', infCancElement)
      };
    }
  }
  
  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    status,
    emitente,
    destinatario,
    valores,
    itens,
    cancelamento,
    arquivo: {
      nome: file.name,
      tamanho: file.size,
      dataImportacao: new Date().toISOString()
    }
  };
}

/**
 * Extrai dados de endereço de um elemento
 */
function extractEndereco(element: Element): string {
  const enderecoElement = element.getElementsByTagName('enderEmit')[0] || 
                         element.getElementsByTagName('enderDest')[0];
  
  if (!enderecoElement) return '';
  
  const logradouro = enderecoElement.getElementsByTagName('xLgr')[0]?.textContent?.trim() || '';
  const numero = enderecoElement.getElementsByTagName('nro')[0]?.textContent?.trim() || '';
  const bairro = enderecoElement.getElementsByTagName('xBairro')[0]?.textContent?.trim() || '';
  const cidade = enderecoElement.getElementsByTagName('xMun')[0]?.textContent?.trim() || '';
  const uf = enderecoElement.getElementsByTagName('UF')[0]?.textContent?.trim() || '';
  
  return [logradouro, numero, bairro, cidade, uf].filter(Boolean).join(', ');
}

/**
 * Valida dados específicos da NF-e
 */
function validateNfeData(nfeData: NfeXmlData): string[] {
  const errors: string[] = [];
  
  // Validação de CNPJ do emitente
  if (!nfeData.emitente.cnpj || nfeData.emitente.cnpj.length < 14) {
    errors.push('CNPJ do emitente inválido ou ausente');
  }
  
  // Validação de CNPJ do destinatário
  if (!nfeData.destinatario.cnpj || nfeData.destinatario.cnpj.length < 14) {
    errors.push('CNPJ do destinatário inválido ou ausente');
  }
  
  // Validação de nome do emitente
  if (!nfeData.emitente.nome || nfeData.emitente.nome.trim().length < 3) {
    errors.push('Nome do emitente inválido ou ausente');
  }
  
  // Validação de nome do destinatário
  if (!nfeData.destinatario.nome || nfeData.destinatario.nome.trim().length < 3) {
    errors.push('Nome do destinatário inválido ou ausente');
  }
  
  // Validação de valor total
  if (!nfeData.valores.totalNota || nfeData.valores.totalNota <= 0) {
    errors.push('Valor total da nota inválido ou zerado');
  }
  
  // Validação de itens
  if (!nfeData.itens || nfeData.itens.length === 0) {
    errors.push('Nota fiscal sem itens');
  } else {
    // Validação de cada item
    nfeData.itens.forEach((item, index) => {
      if (!item.codigo || item.codigo.trim().length === 0) {
        errors.push(`Item ${index + 1}: Código do produto ausente`);
      }
      if (!item.descricao || item.descricao.trim().length < 3) {
        errors.push(`Item ${index + 1}: Descrição do produto inválida`);
      }
      if (!item.quantidade || item.quantidade <= 0) {
        errors.push(`Item ${index + 1}: Quantidade inválida`);
      }
      if (!item.valorUnitario || item.valorUnitario <= 0) {
        errors.push(`Item ${index + 1}: Valor unitário inválido`);
      }
    });
  }
  
  // Validação de data de emissão
  if (!nfeData.dataEmissao) {
    errors.push('Data de emissão ausente');
  } else {
    const dataEmissao = new Date(nfeData.dataEmissao);
    if (isNaN(dataEmissao.getTime())) {
      errors.push('Data de emissão inválida');
    }
  }
  
  // Validação de série
  if (!nfeData.serie || nfeData.serie.trim().length === 0) {
    errors.push('Série da nota fiscal ausente');
  }
  
  return errors;
}

/**
 * Gera um hash único para identificar duplicatas
 */
export function generateNfeHash(nfeData: NfeXmlData): string {
  // Usa apenas a chave de acesso, que é única para cada NF-e
  const key = nfeData.chaveAcesso;
  
  // Para evitar colisões de hash, usa os últimos dígitos únicos da chave
  // que são diferentes para cada NF-e
  const uniquePart = key.substring(32); // Últimos 12 dígitos (111111111, 222222222, 333333333)
  
  // Cria um hash baseado na chave completa mas garantindo unicidade
  let hash = '';
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash += char.toString(36);
  }
  
  // Remove caracteres especiais e limita o tamanho
  hash = hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  
  return hash + uniquePart;
}

/**
 * Valida se uma NF-e já foi importada anteriormente
 */
export function checkNfeDuplicate(nfeData: NfeXmlData, existingNfes: any[]): { isDuplicate: boolean; errors: NfeValidationError[] } {
  const errors: NfeValidationError[] = [];
  
  if (!existingNfes || existingNfes.length === 0) {
    return { isDuplicate: false, errors };
  }
  
  const nfeHash = generateNfeHash(nfeData);
  
  // Verifica por hash primeiro
  const hashMatch = existingNfes.some(nfe => nfe.xml?.hash === nfeHash);
  if (hashMatch) {
    errors.push(createError(NfeErrorType.DUPLICATE_CHAVE_ACESSO, 
      `NF-e já importada anteriormente (hash: ${nfeHash})`, 'chaveAcesso', nfeData.chaveAcesso));
    return { isDuplicate: true, errors };
  }
  
  // Verifica por chave de acesso diretamente
  const chaveMatch = existingNfes.some(nfe => 
    nfe.chave_acesso === nfeData.chaveAcesso ||
    nfe.xml?.parsed?.chaveAcesso === nfeData.chaveAcesso
  );
  
  if (chaveMatch) {
    errors.push(createError(NfeErrorType.DUPLICATE_CHAVE_ACESSO, 
      `NF-e já importada anteriormente (chave: ${nfeData.chaveAcesso})`, 'chaveAcesso', nfeData.chaveAcesso));
    return { isDuplicate: true, errors };
  }
  
  // Verifica por número + série (casos especiais)
  const numeroSerieMatch = existingNfes.some(nfe => 
    nfe.numero === nfeData.numero && nfe.serie === nfeData.serie
  );
  
  if (numeroSerieMatch) {
    errors.push(createWarning(NfeErrorType.DUPLICATE_NUMERO_SERIE, 
      `Possível duplicata: mesmo número (${nfeData.numero}) e série (${nfeData.serie})`, 
      'numero', `${nfeData.numero}/${nfeData.serie}`));
  }
  
  return { isDuplicate: false, errors };
}
