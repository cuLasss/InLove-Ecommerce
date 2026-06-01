// Text normalization utilities for ultra-fast local search

export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(text: string): string {
  return removeAccents(text).toLowerCase().trim();
}

export function extractDigits(text: string): string {
  return text?.replace(/\D/g, '') || '';
}

export function matchesSearch(target: string, query: string): boolean {
  if (!query.trim()) return true;
  
  const normalizedTarget = normalizeText(target);
  const normalizedQuery = normalizeText(query);
  
  return normalizedTarget.includes(normalizedQuery);
}

export function matchesPhone(phone: string, query: string): boolean {
  if (!query.trim()) return true;
  
  const phoneDigits = extractDigits(phone);
  const queryDigits = extractDigits(query);
  
  return phoneDigits.includes(queryDigits);
}