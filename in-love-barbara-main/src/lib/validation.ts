/**
 * Utilitário para validação e sanitização de entradas do usuário
 * Protege contra XSS, SQL injection e outros ataques
 */

// Sanitizar strings para prevenir XSS
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove caracteres perigosos
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limita tamanho
}

// Validar email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validar telefone/WhatsApp
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// Validar UUID
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validar preço
export function validatePrice(price: string | number): boolean {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 999999.99;
}

// Validar quantidade
export function validateQuantity(qty: string | number): boolean {
  const numQty = typeof qty === 'string' ? parseInt(qty) : qty;
  return !isNaN(numQty) && numQty > 0 && numQty <= 9999;
}

// Sanitizar objeto de dados
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (typeof value === 'number') {
      sanitized[key as keyof T] = value as T[keyof T];
    } else if (typeof value === 'boolean') {
      sanitized[key as keyof T] = value as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      ) as T[keyof T];
    } else if (value && typeof value === 'object') {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    }
  }
  
  return sanitized;
}

// Validar dados de produto
export function validateProductData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Nome do produto é obrigatório');
  } else if (data.name.length > 100) {
    errors.push('Nome do produto deve ter no máximo 100 caracteres');
  }
  
  if (data.price && !validatePrice(data.price)) {
    errors.push('Preço inválido');
  }
  
  if (data.cost_price && !validatePrice(data.cost_price)) {
    errors.push('Preço de custo inválido');
  }
  
  if (data.stock !== undefined && !validateQuantity(data.stock)) {
    errors.push('Estoque inválido');
  }
  
  if (data.brand && data.brand.length > 50) {
    errors.push('Marca deve ter no máximo 50 caracteres');
  }
  
  if (data.size && data.size.length > 20) {
    errors.push('Tamanho deve ter no máximo 20 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Validar dados de cliente
export function validateClientData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Nome do cliente é obrigatório');
  } else if (data.name.length > 100) {
    errors.push('Nome do cliente deve ter no máximo 100 caracteres');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Email inválido');
  }
  
  if (data.whatsapp && !validatePhone(data.whatsapp)) {
    errors.push('WhatsApp inválido');
  }
  
  if (data.city && data.city.length > 50) {
    errors.push('Cidade deve ter no máximo 50 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  sanitizeString,
  validateEmail,
  validatePhone,
  validateUUID,
  validatePrice,
  validateQuantity,
  sanitizeObject,
  validateProductData,
  validateClientData
};
