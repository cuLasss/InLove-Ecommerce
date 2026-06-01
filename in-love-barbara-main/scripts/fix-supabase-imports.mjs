#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Função para buscar arquivos recursivamente
function findFiles(dir, extensions = ['.ts', '.tsx']) {
  let results = [];
  const list = readdirSync(dir);
  
  list.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.includes(extname(file))) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Função para corrigir um arquivo
function fixFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Padrões a serem substituídos
    const patterns = [
      {
        search: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"];?\s*\n?/g,
        replace: '// Sistema local - não precisa de Supabase\n'
      },
      {
        search: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"];?\s*/g,
        replace: '// Sistema local - não precisa de Supabase '
      },
      // Remover chamadas diretas ao supabase
      {
        search: /supabase\./g,
        replace: '// supabase.'
      }
    ];
    
    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
      }
    });
    
    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Executar correção
console.log('🔄 Iniciando correção dos imports do Supabase...\n');

const srcDir = 'src';
const files = findFiles(srcDir);
let fixedCount = 0;

files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Correção concluída! ${fixedCount} arquivos foram modificados.`);
