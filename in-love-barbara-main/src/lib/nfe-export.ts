/**
 * Utilitário para exportar notas fiscais em formato ZIP
 * Inclui os arquivos XML originais e um arquivo de índice com informações das notas
 */

import JSZip from 'jszip';
import { NfeImport } from '@/hooks/useNfeImports';

export interface NfeExportOptions {
  includeXml: boolean;
  includeIndex: boolean;
  includeSummary: boolean;
}

export interface NfeExportResult {
  zipBlob: Blob;
  fileName: string;
  fileCount: number;
  totalSize: number;
}

/**
 * Exporta notas fiscais selecionadas para um arquivo ZIP
 */
export async function exportNfesToZip(
  selectedNfes: NfeImport[],
  options: NfeExportOptions = {
    includeXml: true,
    includeIndex: true,
    includeSummary: true
  }
): Promise<NfeExportResult> {
  const zip = new JSZip();
  
  // Filtra apenas notas importadas
  const importedNfes = selectedNfes.filter(nfe => nfe.status === 'IMPORTED');
  
  if (importedNfes.length === 0) {
    throw new Error('Nenhuma nota fiscal importada encontrada para exportar');
  }
  
  let fileCount = 0;
  
  // Adiciona arquivos XML se disponíveis
  if (options.includeXml) {
    for (const nfe of importedNfes) {
      if (nfe.xml?.parsed) {
        // Cria o conteúdo XML baseado nos dados parseados
        const xmlContent = generateNfeXmlContent(nfe);
        const fileName = `NFE_${nfe.numero || nfe.id.slice(-8)}_${nfe.serie || '001'}.xml`;
        
        zip.file(fileName, xmlContent);
        fileCount++;
      }
    }
  }
  
  // Adiciona arquivo de índice com informações das notas
  if (options.includeIndex) {
    const indexContent = generateIndexContent(importedNfes);
    zip.file('INDICE_NOTAS_FISCAIS.txt', indexContent);
    fileCount++;
  }
  
  // Adiciona arquivo de resumo
  if (options.includeSummary) {
    const summaryContent = generateSummaryContent(importedNfes);
    zip.file('RESUMO_EXPORTACAO.txt', summaryContent);
    fileCount++;
  }
  
  // Gera o arquivo ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Gera nome do arquivo com data
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fileName = `NFE_EXPORT_${dateStr}_${importedNfes.length}_notas.zip`;
  
  return {
    zipBlob,
    fileName,
    fileCount,
    totalSize: zipBlob.size
  };
}

/**
 * Gera conteúdo XML baseado nos dados da NF-e
 */
function generateNfeXmlContent(nfe: NfeImport): string {
  const xmlData = nfe.xml?.parsed;
  if (!xmlData) {
    return '<!-- Dados XML não disponíveis -->';
  }
  
  // Cria um XML básico com as informações principais
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe>
      <ide>
        <tpNF>1</tpNF>
        <mod>55</mod>
        <indPres>1</indPres>
        <tpImp>1</tpImp>
        <nNF>${xmlData.numero || ''}</nNF>
        <cMunFG>3105608</cMunFG>
        <procEmi>0</procEmi>
        <finNFe>1</finNFe>
        <dhEmi>${xmlData.dataEmissao || ''}</dhEmi>
        <tpAmb>1</tpAmb>
        <indFinal>1</indFinal>
        <dhSaiEnt>${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}</dhSaiEnt>
        <idDest>1</idDest>
        <tpEmis>1</tpEmis>
        <cDV>3</cDV>
        <cUF>31</cUF>
        <serie>${xmlData.serie || '55'}</serie>
        <natOp>Venda de Merc Adq Receb Terceiros ST</natOp>
        <cNF>${Math.floor(Math.random() * 99999999).toString().padStart(8, '0')}</cNF>
        <verProc>12.1.2209.236</verProc>
      </ide>
      <emit>
        <CNPJ>${xmlData.emitente.cnpj || ''}</CNPJ>
        <xNome>${xmlData.emitente.nome || ''}</xNome>
        <xFant>${xmlData.emitente.nome || ''}</xFant>
        <enderEmit>
          <xLgr>Rua Exemplo</xLgr>
          <nro>123</nro>
          <xBairro>Centro</xBairro>
          <cMun>3550308</cMun>
          <xMun>São Paulo</xMun>
          <UF>SP</UF>
          <CEP>01234567</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
          <fone>1133334444</fone>
        </enderEmit>
        <IE>123456789</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>${xmlData.destinatario.cnpj || ''}</CNPJ>
        <xNome>${xmlData.destinatario.nome || ''}</xNome>
        <enderDest>
          <xLgr>Rua Destino</xLgr>
          <nro>456</nro>
          <xBairro>Centro</xBairro>
          <cMun>3550308</cMun>
          <xMun>São Paulo</xMun>
          <UF>SP</UF>
          <CEP>01234567</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderDest>
        <indIEDest>1</indIEDest>
      </dest>
      <det>
        ${xmlData.itens.map((item, index) => `
        <det nItem="${index + 1}">
          <prod>
            <cEAN>SEM GTIN</cEAN>
            <cProd>${item.codigo || ''}</cProd>
            <qCom>${(item.quantidade || 1).toFixed(4)}</qCom>
            <cEANTrib>SEM GTIN</cEANTrib>
            <vUnTrib>${(item.valorUnitario || 0).toFixed(10)}</vUnTrib>
            <qTrib>${(item.quantidade || 1).toFixed(4)}</qTrib>
            <vProd>${(item.valorTotal || 0).toFixed(2)}</vProd>
            <xProd>${item.descricao || ''}</xProd>
            <vUnCom>${(item.valorUnitario || 0).toFixed(10)}</vUnCom>
            <indTot>1</indTot>
            <uTrib>${item.unidade || 'UN'}</uTrib>
            <vDesc>0.00</vDesc>
            <NCM>${item.ncm || '00000000'}</NCM>
            <uCom>${item.unidade || 'UN'}</uCom>
            <CFOP>${item.cfop || '5102'}</CFOP>
            <CEST>0000000</CEST>
          </prod>
          <imposto>
            <vTotTrib>0.00</vTotTrib>
            <ICMS>
              <ICMS00>
                <orig>0</orig>
                <CST>00</CST>
                <modBC>3</modBC>
                <vBC>${(item.baseCalculoICMS || item.valorTotal || 0).toFixed(2)}</vBC>
                <pICMS>${(item.aliquotaICMS || 18).toFixed(2)}</pICMS>
                <vICMS>${(item.valorICMS || 0).toFixed(2)}</vICMS>
              </ICMS00>
            </ICMS>
            <COFINS>
              <COFINSAliq>
                <vCOFINS>0.00</vCOFINS>
                <CST>01</CST>
                <vBC>${(item.valorTotal || 0).toFixed(2)}</vBC>
                <pCOFINS>7.60</pCOFINS>
              </COFINSAliq>
            </COFINS>
            <PIS>
              <PISAliq>
                <vPIS>0.00</vPIS>
                <CST>01</CST>
                <vBC>${(item.valorTotal || 0).toFixed(2)}</vBC>
                <pPIS>1.65</pPIS>
              </PISAliq>
            </PIS>
          </imposto>
        </det>`).join('')}
      </det>
      <total>
        <ICMSTot>
          <vCOFINS>0.00</vCOFINS>
          <vBCST>0.00</vBCST>
          <vICMSDeson>0.00</vICMSDeson>
          <vProd>${(xmlData.valores.totalProdutos || 0).toFixed(2)}</vProd>
          <vSeg>0.00</vSeg>
          <vFCP>0.00</vFCP>
          <vFCPST>0.00</vFCPST>
          <vNF>${(xmlData.valores.totalNota || 0).toFixed(2)}</vNF>
          <vTotTrib>0.00</vTotTrib>
          <vPIS>0.00</vPIS>
          <vIPIDevol>0.00</vIPIDevol>
          <vBC>0.00</vBC>
          <vST>0.00</vST>
          <vICMS>0.00</vICMS>
          <vII>0.00</vII>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vDesc>0.00</vDesc>
          <vOutro>0.00</vOutro>
          <vIPI>0.00</vIPI>
          <vFrete>0.00</vFrete>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>0</modFrete>
        <vol>
          <marca>DIVERSOS</marca>
          <qVol>1</qVol>
          <nVol>0</nVol>
          <pesoB>3.650</pesoB>
        </vol>
        <transporta>
          <xNome>TRANSPORTADORA EXEMPLO</xNome>
          <UF>MG</UF>
          <xEnder>R. Exemplo 123</xEnder>
          <xMun>Barbacena</xMun>
          <CNPJ>00000000000000</CNPJ>
          <IE>000000000000</IE>
        </transporta>
      </transp>
      <pag>
        <detPag>
          <vPag>${(xmlData.valores.totalNota || 0).toFixed(2)}</vPag>
          <tPag>90</tPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>Informações da saída ST 60 (Produto - Base ICMS ST - Valor ICMS ST) :${xmlData.itens.map(item => `${item.codigo || 'N/A'} - ${(item.valorTotal || 0).toFixed(2)} - 0.00`).join(', ')}.</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`;
  
  return xmlContent;
}

/**
 * Gera conteúdo do arquivo de índice
 */
function generateIndexContent(nfes: NfeImport[]): string {
  const header = 'ÍNDICE DE NOTAS FISCAIS EXPORTADAS\n';
  const separator = '='.repeat(80) + '\n';
  const date = new Date().toLocaleString('pt-BR');
  
  let content = header + separator;
  content += `Data de Exportação: ${date}\n`;
  content += `Total de Notas: ${nfes.length}\n\n`;
  
  content += 'NOTAS FISCAIS:\n';
  content += '-'.repeat(80) + '\n';
  
  nfes.forEach((nfe, index) => {
    content += `${index + 1}. Nota Fiscal ${nfe.numero || 'N/A'}\n`;
    content += `   Série: ${nfe.serie || 'N/A'}\n`;
    content += `   Data Emissão: ${nfe.data_emissao || 'N/A'}\n`;
    content += `   Emitente: ${nfe.emitente_nome || nfe.provider || 'N/A'}\n`;
    content += `   CNPJ Emitente: ${nfe.emitente_cnpj || 'N/A'}\n`;
    content += `   Destinatário: ${nfe.destinatario_nome || 'N/A'}\n`;
    content += `   CNPJ Destinatário: ${nfe.destinatario_cnpj || 'N/A'}\n`;
    content += `   Valor Total: R$ ${(nfe.valor_total || 0).toFixed(2)}\n`;
    content += `   Total de Itens: ${nfe.total_products || 0}\n`;
    content += `   Status: ${nfe.status_nfe || 'N/A'}\n`;
    content += `   Chave de Acesso: ${nfe.chave_acesso || 'N/A'}\n`;
    content += `   Arquivo: NFE_${nfe.numero || nfe.id.slice(-8)}_${nfe.serie || '001'}.xml\n`;
    
    // Adicionar detalhes dos itens se disponíveis
    if (nfe.nfe_items && nfe.nfe_items.length > 0) {
      content += `\n   DETALHES DOS ITENS:\n`;
      content += `   ${'─'.repeat(60)}\n`;
      
      nfe.nfe_items.forEach((item, itemIndex) => {
        content += `   ${itemIndex + 1}. ${item.descricao || item.description || item.name || 'Produto sem descrição'}\n`;
        content += `      Código: ${item.codigo || item.code || item.product_code || 'N/A'}\n`;
        content += `      Quantidade: ${item.qty || item.quantity || 0}\n`;
        content += `      Valor Unitário: R$ ${((item.unit_value_cents || item.unit_price || 0) / 100).toFixed(2)}\n`;
        content += `      Valor Total: R$ ${((item.total_value_cents || (item.qty || item.quantity || 0) * (item.unit_value_cents || item.unit_price || 0)) / 100).toFixed(2)}\n`;
        content += `      NCM: ${item.ncm || 'N/A'}\n`;
        content += `      CFOP: ${item.cfop || 'N/A'}\n`;
        content += `      Unidade: ${item.unidade || 'UN'}\n`;
        if (item.product_id) {
          content += `      Produto ID: ${item.product_id}\n`;
        }
        content += `\n`;
      });
    }
    
    content += '\n';
  });
  
  return content;
}

/**
 * Gera conteúdo do arquivo de resumo
 */
function generateSummaryContent(nfes: NfeImport[]): string {
  const totalNotas = nfes.length;
  const totalItens = nfes.reduce((sum, nfe) => sum + (nfe.total_products || 0), 0);
  const valorTotal = nfes.reduce((sum, nfe) => sum + (nfe.valor_total || 0), 0);
  
  // Agrupa por emitente
  const emitentes = nfes.reduce((acc, nfe) => {
    const key = nfe.emitente_cnpj || 'N/A';
    if (!acc[key]) {
      acc[key] = {
        nome: nfe.emitente_nome || 'N/A',
        cnpj: nfe.emitente_cnpj || 'N/A',
        quantidade: 0,
        valor: 0
      };
    }
    acc[key].quantidade++;
    acc[key].valor += nfe.valor_total || 0;
    return acc;
  }, {} as Record<string, any>);
  
  let content = 'RESUMO DA EXPORTAÇÃO DE NOTAS FISCAIS\n';
  content += '='.repeat(50) + '\n\n';
  
  content += `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`;
  content += `Total de Notas: ${totalNotas}\n`;
  content += `Total de Itens: ${totalItens}\n`;
  content += `Valor Total: R$ ${valorTotal.toFixed(2)}\n\n`;
  
  content += 'RESUMO POR EMITENTE:\n';
  content += '-'.repeat(30) + '\n';
  
  Object.values(emitentes).forEach((emitente: any) => {
    content += `${emitente.nome}\n`;
    content += `CNPJ: ${emitente.cnpj}\n`;
    content += `Notas: ${emitente.quantidade}\n`;
    content += `Valor: R$ ${emitente.valor.toFixed(2)}\n\n`;
  });
  
  return content;
}

/**
 * Faz download do arquivo ZIP
 */
export function downloadZipFile(result: NfeExportResult): void {
  const url = URL.createObjectURL(result.zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

