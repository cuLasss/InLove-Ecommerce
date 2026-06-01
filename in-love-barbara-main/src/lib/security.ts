/**
 * Utilitário de segurança para validação e sanitização
 * Previne ataques XSS, validação de entrada e outras vulnerabilidades
 */

import { logger } from './logger';

// Tipos para validação
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

export interface SecurityConfig {
  maxLength: number;
  minLength: number;
  allowedChars?: RegExp;
  forbiddenChars?: RegExp;
}

/**
 * Sanitiza texto removendo caracteres perigosos
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove todas as tags HTML
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, maxLength);
}

/**
 * Valida e sanitiza email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email é obrigatório' };
  }

  const sanitizedEmail = sanitizeText(email, 254);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitizedEmail)) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  return { 
    isValid: true, 
    sanitizedValue: sanitizedEmail.toLowerCase() 
  };
}

/**
 * Valida e sanitiza telefone/WhatsApp
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true, sanitizedValue: null }; // Telefone é opcional
  }

  const sanitizedPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos
  
  if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
    return { isValid: false, error: 'Telefone deve ter entre 10 e 15 dígitos' };
  }

  return { 
    isValid: true, 
    sanitizedValue: sanitizedPhone 
  };
}

/**
 * Valida e sanitiza nome de produto/cliente
 */
export function validateName(name: string, maxLength: number = 100): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Nome é obrigatório' };
  }

  const sanitizedName = sanitizeText(name, maxLength);
  
  if (sanitizedName.length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }

  if (sanitizedName.length > maxLength) {
    return { isValid: false, error: `Nome deve ter no máximo ${maxLength} caracteres` };
  }

  return { 
    isValid: true, 
    sanitizedValue: sanitizedName 
  };
}

/**
 * Valida e sanitiza preço
 */
export function validatePrice(price: string | number): ValidationResult {
  if (!price) {
    return { isValid: false, error: 'Preço é obrigatório' };
  }

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numericPrice)) {
    return { isValid: false, error: 'Preço deve ser um número válido' };
  }

  if (numericPrice < 0) {
    return { isValid: false, error: 'Preço não pode ser negativo' };
  }

  if (numericPrice > 999999.99) {
    return { isValid: false, error: 'Preço máximo permitido é R$ 999.999,99' };
  }

  return { 
    isValid: true, 
    sanitizedValue: Math.round(numericPrice * 100) // Converter para centavos
  };
}

/**
 * Valida e sanitiza quantidade
 */
export function validateQuantity(quantity: string | number): ValidationResult {
  if (!quantity) {
    return { isValid: false, error: 'Quantidade é obrigatória' };
  }

  const numericQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
  
  if (isNaN(numericQuantity)) {
    return { isValid: false, error: 'Quantidade deve ser um número válido' };
  }

  if (numericQuantity < 0) {
    return { isValid: false, error: 'Quantidade não pode ser negativa' };
  }

  if (numericQuantity > 99999) {
    return { isValid: false, error: 'Quantidade máxima permitida é 99.999' };
  }

  return { 
    isValid: true, 
    sanitizedValue: numericQuantity 
  };
}

/**
 * Valida UUID
 */
export function validateUUID(uuid: string): ValidationResult {
  if (!uuid) {
    return { isValid: false, error: 'UUID é obrigatório' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    return { isValid: false, error: 'UUID inválido' };
  }

  return { 
    isValid: true, 
    sanitizedValue: uuid.toLowerCase() 
  };
}

/**
 * Valida canal de venda
 */
export function validateSaleChannel(channel: string): ValidationResult {
  const validChannels = ['VAREJO', 'ATACADO'];
  
  if (!validChannels.includes(channel)) {
    return { isValid: false, error: 'Canal de venda inválido' };
  }

  return { 
    isValid: true, 
    sanitizedValue: channel 
  };
}

/**
 * Valida método de pagamento
 */
export function validatePaymentMethod(method: string): ValidationResult {
  const validMethods = ['DINHEIRO', 'CARTAO', 'PIX', 'BOLETO', 'TRANSFERENCIA'];
  
  if (!validMethods.includes(method)) {
    return { isValid: false, error: 'Método de pagamento inválido' };
  }

  return { 
    isValid: true, 
    sanitizedValue: method 
  };
}

/**
 * Valida status de venda
 */
export function validateSaleStatus(status: string): ValidationResult {
  const validStatuses = ['RASCUNHO', 'FECHADA', 'CANCELADA'];
  
  if (!validStatuses.includes(status)) {
    return { isValid: false, error: 'Status de venda inválido' };
  }

  return { 
    isValid: true, 
    sanitizedValue: status 
  };
}

/**
 * Valida role de usuário
 */
export function validateUserRole(role: string): ValidationResult {
  const validRoles = ['ADMIN', 'COLAB'];
  
  if (!validRoles.includes(role)) {
    return { isValid: false, error: 'Role de usuário inválido' };
  }

  return { 
    isValid: true, 
    sanitizedValue: role 
  };
}

/**
 * Valida dados de produto completo
 */
export function validateProductData(productData: any): ValidationResult {
  const errors: string[] = [];

  // Validar nome
  const nameValidation = validateName(productData.name, 100);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!);
  }

  // Validar preço
  const priceValidation = validatePrice(productData.price_cents);
  if (!priceValidation.isValid) {
    errors.push(priceValidation.error!);
  }

  // Validar preço de custo
  const costPriceValidation = validatePrice(productData.cost_price_cents);
  if (!costPriceValidation.isValid) {
    errors.push(costPriceValidation.error!);
  }

  // Validar estoque
  const stockValidation = validateQuantity(productData.stock);
  if (!stockValidation.isValid) {
    errors.push(stockValidation.error!);
  }

  // Validar categoria se fornecida
  if (productData.category_id) {
    const categoryValidation = validateUUID(productData.category_id);
    if (!categoryValidation.isValid) {
      errors.push('Categoria inválida');
    }
  }

  // Validar fornecedor se fornecido
  if (productData.supplier_id) {
    const supplierValidation = validateUUID(productData.supplier_id);
    if (!supplierValidation.isValid) {
      errors.push('Fornecedor inválido');
    }
  }

  if (errors.length > 0) {
    return { 
      isValid: false, 
      error: errors.join('; ') 
    };
  }

  return { 
    isValid: true, 
    sanitizedValue: {
      ...productData,
      name: nameValidation.sanitizedValue,
      price_cents: priceValidation.sanitizedValue,
      cost_price_cents: costPriceValidation.sanitizedValue,
      stock: stockValidation.sanitizedValue
    }
  };
}

/**
 * Valida dados de cliente completo
 */
export function validateClientData(clientData: any): ValidationResult {
  const errors: string[] = [];

  // Validar nome
  const nameValidation = validateName(clientData.name, 100);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!);
  }

  // Validar email se fornecido
  if (clientData.email) {
    const emailValidation = validateEmail(clientData.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error!);
    }
  }

  // Validar WhatsApp se fornecido
  if (clientData.whatsapp) {
    const phoneValidation = validatePhone(clientData.whatsapp);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error!);
    }
  }

  if (errors.length > 0) {
    return { 
      isValid: false, 
      error: errors.join('; ') 
    };
  }

  return { 
    isValid: true, 
    sanitizedValue: {
      ...clientData,
      name: nameValidation.sanitizedValue,
      email: clientData.email ? validateEmail(clientData.email).sanitizedValue : null,
      whatsapp: clientData.whatsapp ? validatePhone(clientData.whatsapp).sanitizedValue : null
    }
  };
}

/**
 * Valida dados de venda completo
 */
export function validateSaleData(saleData: any): ValidationResult {
  const errors: string[] = [];

  // Validar canal
  const channelValidation = validateSaleChannel(saleData.channel);
  if (!channelValidation.isValid) {
    errors.push(channelValidation.error!);
  }

  // Validar status
  const statusValidation = validateSaleStatus(saleData.status);
  if (!statusValidation.isValid) {
    errors.push(statusValidation.error!);
  }

  // Validar cliente se fornecido
  if (saleData.client_id) {
    const clientValidation = validateUUID(saleData.client_id);
    if (!clientValidation.isValid) {
      errors.push('Cliente inválido');
    }
  }

  if (errors.length > 0) {
    return { 
      isValid: false, 
      error: errors.join('; ') 
    };
  }

  return { 
    isValid: true, 
    sanitizedValue: {
      ...saleData,
      channel: channelValidation.sanitizedValue,
      status: statusValidation.sanitizedValue
    }
  };
}

/**
 * Log de segurança para auditoria
 */
export function logSecurityEvent(event: string, details: any = {}) {
  logger.security(`Security Event: ${event}`, details);
}

/**
 * Verifica se uma string contém caracteres perigosos
 */
export function containsDangerousChars(input: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i
  ];

  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Escape HTML para prevenir XSS
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export default {
  sanitizeText,
  validateEmail,
  validatePhone,
  validateName,
  validatePrice,
  validateQuantity,
  validateUUID,
  validateSaleChannel,
  validatePaymentMethod,
  validateSaleStatus,
  validateUserRole,
  validateProductData,
  validateClientData,
  validateSaleData,
  logSecurityEvent,
  containsDangerousChars,
  escapeHtml
};
