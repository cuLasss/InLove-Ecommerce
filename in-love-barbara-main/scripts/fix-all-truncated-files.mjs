#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Função para encontrar arquivos .ts e .tsx
function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
        traverse(fullPath)
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

// Função para verificar se um arquivo está truncado
function isFileTruncated(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Verifica se termina com comentário "// Sistema local" sem fechamento adequado
    const lines = content.split('\n')
    const lastLine = lines[lines.length - 1].trim()
    
    // Se a última linha é um comentário "Sistema local" e não há fechamento de função/objeto
    if (lastLine.includes('// Sistema local')) {
      // Conta chaves abertas vs fechadas
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      
      if (openBraces > closeBraces) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error(`Erro ao verificar arquivo ${filePath}:`, error.message)
    return false
  }
}

// Função para tentar corrigir arquivo truncado
function fixTruncatedFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    
    // Conta chaves abertas vs fechadas
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    const missingBraces = openBraces - closeBraces
    
    if (missingBraces > 0) {
      // Adiciona as chaves faltantes
      let fixedContent = content
      
      // Se a última linha não está vazia, adiciona uma quebra
      if (lines[lines.length - 1].trim() !== '') {
        fixedContent += '\n'
      }
      
      // Adiciona as chaves faltantes com indentação apropriada
      for (let i = 0; i < missingBraces; i++) {
        const indent = '  '.repeat(missingBraces - i - 1)
        fixedContent += `${indent}}\n`
      }
      
      // Salva o arquivo corrigido
      fs.writeFileSync(filePath, fixedContent, 'utf8')
      console.log(`✅ Corrigido: ${path.relative(projectRoot, filePath)}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${filePath}:`, error.message)
    return false
  }
}

// Função principal
function main() {
  console.log('🔍 Procurando arquivos truncados...')
  
  const srcDir = path.join(projectRoot, 'src')
  const files = findFiles(srcDir)
  
  let truncatedFiles = []
  let fixedFiles = []
  
  for (const file of files) {
    if (isFileTruncated(file)) {
      truncatedFiles.push(file)
      console.log(`🔧 Arquivo truncado encontrado: ${path.relative(projectRoot, file)}`)
      
      if (fixTruncatedFile(file)) {
        fixedFiles.push(file)
      }
    }
  }
  
  console.log(`\n📊 Resumo:`)
  console.log(`- Arquivos verificados: ${files.length}`)
  console.log(`- Arquivos truncados encontrados: ${truncatedFiles.length}`)
  console.log(`- Arquivos corrigidos: ${fixedFiles.length}`)
  
  if (fixedFiles.length > 0) {
    console.log(`\n✅ Arquivos corrigidos:`)
    fixedFiles.forEach(file => {
      console.log(`  - ${path.relative(projectRoot, file)}`)
    })
  }
  
  if (truncatedFiles.length === 0) {
    console.log('\n🎉 Nenhum arquivo truncado encontrado!')
  }
}

main()
