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
    
    // Corrigir erros de sintaxe específicos
    const fixes = [
      // Corrigir await // supabase.rpc
      {
        search: /await \/\/ supabase\.rpc\([^)]+\)/g,
        replace: (match) => {
          return `Promise.resolve({ data: null, error: null })`;
        }
      },
      // Corrigir await // supabase.auth
      {
        search: /await \/\/ supabase\.auth\.[^(]+\([^)]*\)/g,
        replace: (match) => {
          return `Promise.resolve({ data: { user: null, session: null }, error: null })`;
        }
      },
      // Corrigir await // supabase.from
      {
        search: /await \/\/ supabase\.from\([^)]+\)[^;]+/g,
        replace: (match) => {
          return `Promise.resolve({ data: null, error: null })`;
        }
      },
      // Corrigir // supabase. no meio de expressões
      {
        search: /\/\/ supabase\./g,
        replace: '// Removido: supabase.'
      }
    ];
    
    fixes.forEach(fix => {
      if (typeof fix.replace === 'function') {
        content = content.replace(fix.search, fix.replace);
      } else {
        if (fix.search.test(content)) {
          content = content.replace(fix.search, fix.replace);
          modified = true;
        }
      }
    });
    
    // Verificar se ainda há problemas de sintaxe
    if (content.includes('await // supabase') || content.includes('= await // supabase')) {
      modified = true;
    }
    
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
console.log('🔄 Corrigindo erros de sintaxe...\n');

const srcDir = 'src';
const files = findFiles(srcDir);
let fixedCount = 0;

files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Correção de sintaxe concluída! ${fixedCount} arquivos foram modificados.`);
