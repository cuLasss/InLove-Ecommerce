import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  Loader2,
  Package,
  User,
  DollarSign,
  Calendar,
  Settings,
  Cloud,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface Sale {
  id: string;
  client_id: string;
  user_id: string;
  channel: string;
  status: string;
  total_cents: number;
  created_at: string;
  client?: {
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    address?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  user?: {
    name: string;
  };
  payments?: Array<{
    amount_cents: number;
    method: string;
    created_at: string;
  }>;
  items?: Array<{
    id: string;
    product_id: string;
    qty: number;
    unit_price_cents: number;
    total_cents: number;
    product?: {
      name: string;
      sku?: string;
      ncm?: string;
    };
  }>;
}

interface VarejoNfeGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

// Dados fiscais de demo. Configure dados reais apenas em ambiente seguro.
const EMPRESA_CONFIG = {
  cnpj: '',
  razaoSocial: 'IN LOVE DEMO',
  nomeFantasia: 'IN LOVE',
  ie: '',
  endereco: {
    logradouro: '',
    numero: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
    telefone: ''
  }
};

// APIs de NF-e disponíveis
const NFE_APIS = [
  { id: 'local', name: 'Geração Local', description: 'Geração local de NF-e para desenvolvimento' }
];

// Ambientes disponíveis
const NFE_ENVIRONMENTS = {
  homologacao: {
    id: 'homologacao',
    name: 'Homologação',
    description: 'Ambiente de testes da SEFAZ'
  },
  producao: {
    id: 'producao',
    name: 'Produção',
    description: 'Ambiente de produção da SEFAZ'
  }
};

// Função de validação simplificada
const validateNfeData = (nfeData: any): string[] => {
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

// Função de formatação simplificada
const formatNfeDataForApi = (nfeData: any, provider: string): any => {
  return {
    ambiente: nfeData.ambiente,
    serie: nfeData.serie,
    numero: nfeData.numero,
    dataEmissao: nfeData.dataEmissao,
    emitente: nfeData.emitente,
    destinatario: nfeData.destinatario,
    itens: nfeData.itens,
    valores: nfeData.valores
  };
};

// Função de emissão apenas local
const emitirNfe = async (provider: string, nfeData: any): Promise<any> => {
  console.log('🌐 Modo de geração:', provider);
  console.log('📊 Dados da NF-e:', nfeData);
  
  // Simulação de geração local
  console.log('🌐 Gerando NF-e localmente...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    chaveAcesso: `3125${Date.now().toString().slice(-12)}${nfeData.numero}${nfeData.serie}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
    protocolo: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    status: 'AUTORIZADA',
    message: 'NF-e gerada com sucesso (modo local)'
  };
};

export function VarejoNfeGenerationModal({ isOpen, onClose, sale }: VarejoNfeGenerationModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<{
    pdf?: Blob;
    xml?: string;
    fileName?: string;
  }>({});
  
  // Configurações da NF-e
  const [nfeConfig, setNfeConfig] = useState({
    apiProvider: 'local', // APENAS GERAÇÃO LOCAL
    ambiente: 'homologacao', // homologacao ou producao
    serie: '001',
    numeroInicial: '1',
    usarApiReal: false // SEMPRE FALSE PARA GERAÇÃO LOCAL
  });

  if (!sale) return null;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const generateNfeData = () => {
    // Validação básica dos dados
    if (!sale) {
      throw new Error('Dados da venda não encontrados');
    }
    
    console.log('🔍 [NF-e] Dados da venda:', sale);
    console.log('🔍 [NF-e] Items da venda:', (sale as any).items);
    console.log('🔍 [NF-e] Sale items (alternativo):', (sale as any).sale_items);
    
    // Verificar itens em diferentes estruturas possíveis
    const items = (sale as any).items || (sale as any).sale_items || [];
    
    if (!items || items.length === 0) {
      console.error('❌ [NF-e] Nenhum item encontrado. Estrutura da venda:', {
        hasItems: !!(sale as any).items,
        hasSaleItems: !!(sale as any).sale_items,
        itemsLength: (sale as any).items?.length || 0,
        saleItemsLength: (sale as any).sale_items?.length || 0,
        saleKeys: Object.keys(sale)
      });
      throw new Error('Nenhum item encontrado na venda');
    }
    
    console.log('✅ [NF-e] Items encontrados:', items.length);
    
    const nfeNumber = (nfeConfig.numeroInicial || '1').padStart(9, '0');
    const issueDate = new Date();
    
    return {
      numero: nfeNumber,
      serie: nfeConfig.serie,
      dataEmissao: issueDate.toISOString(),
      ambiente: nfeConfig.ambiente,
      emitente: EMPRESA_CONFIG,
      destinatario: {
        cnpj: sale.client?.document || '000.000.000-00',
        nome: sale.client?.name || 'Cliente não informado',
        endereco: {
          logradouro: sale.client?.address || 'Endereço não informado',
          bairro: 'Bairro não informado',
          municipio: sale.client?.city || 'Cidade não informada',
          uf: sale.client?.state || 'SP',
          cep: sale.client?.zipcode || '00000-000'
        }
      },
      itens: items.map((item, index) => ({
        codigo: item.product?.sku || `ITEM${index + 1}`,
        descricao: item.product?.name || 'Produto não encontrado',
        ncm: item.product?.ncm || '6208.92.00',
        cfop: '5102',
        unidade: 'UN',
        quantidade: item.qty || 1,
        valorUnitario: ((item.unit_price_cents || 0) / 100).toFixed(2),
        valorTotal: ((item.total_cents || 0) / 100).toFixed(2),
        baseCalculoICMS: ((item.total_cents || 0) / 100).toFixed(2),
        aliquotaICMS: '18.00',
        valorICMS: (((item.total_cents || 0) / 100) * 0.18).toFixed(2)
      })),
      valores: {
        totalProdutos: ((sale.total_cents || 0) / 100).toFixed(2),
        baseCalculoICMS: ((sale.total_cents || 0) / 100).toFixed(2),
        valorICMS: (((sale.total_cents || 0) / 100) * 0.18).toFixed(2),
        totalNota: ((sale.total_cents || 0) / 100).toFixed(2)
      }
    };
  };

  const generateNfeXml = (nfeData: any) => {
    // Gerar chave de acesso única
    const chaveAcesso = `3125${Date.now().toString().slice(-12)}${nfeData.numero}${nfeData.serie}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    const protocolo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <protNFe>
    <infProt>
      <nProt>${protocolo}</nProt>
      <digVal>yMrTHMnWVpmP8UYTzuQ9LDah8X8=</digVal>
      <dhRecbto>${new Date().toISOString()}</dhRecbto>
      <chNFe>${chaveAcesso}</chNFe>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
      <cStat>100</cStat>
    </infProt>
  </protNFe>
  <NFe>
    <infNFe Id="NFe${chaveAcesso}">
      <infAdic>
        <infCpl>Informações da venda: ${nfeData.itens.length} produto(s) - Total: R$ ${nfeData.valores.totalNota}</infCpl>
      </infAdic>
      ${nfeData.itens.map((item: any, index: number) => `
      <det>
        <nItem>${index + 1}</nItem>
        <prod>
          <cEAN>SEM GTIN</cEAN>
          <cProd>${item.codigo}</cProd>
          <qCom>${item.quantidade}</qCom>
          <cEANTrib>SEM GTIN</cEANTrib>
          <vUnTrib>${item.valorUnitario}</vUnTrib>
          <qTrib>${item.quantidade}</qTrib>
          <vProd>${item.valorTotal}</vProd>
          <xProd>${item.descricao}</xProd>
          <vUnCom>${item.valorUnitario}</vUnCom>
          <indTot>1</indTot>
          <uTrib>${item.unidade}</uTrib>
          <NCM>${item.ncm}</NCM>
          <uCom>${item.unidade}</uCom>
          <CFOP>${item.cfop}</CFOP>
          <CEST>1003000</CEST>
        </prod>
        <imposto>
          <vTotTrib>0.00</vTotTrib>
          <ICMS>
            <ICMS60>
              <pST>0.00</pST>
              <orig>0</orig>
              <CST>60</CST>
              <vBCSTRet>${item.valorTotal}</vBCSTRet>
              <vICMSSubstituto>0.00</vICMSSubstituto>
              <vICMSSTRet>0.00</vICMSSTRet>
            </ICMS60>
          </ICMS>
          <COFINS>
            <COFINSAliq>
              <vCOFINS>${(parseFloat(item.valorTotal) * 0.076).toFixed(2)}</vCOFINS>
              <CST>01</CST>
              <vBC>${item.valorTotal}</vBC>
              <pCOFINS>7.60</pCOFINS>
            </COFINSAliq>
          </COFINS>
          <PIS>
            <PISAliq>
              <vPIS>${(parseFloat(item.valorTotal) * 0.0165).toFixed(2)}</vPIS>
              <CST>01</CST>
              <vBC>${item.valorTotal}</vBC>
              <pPIS>1.65</pPIS>
            </PISAliq>
          </PIS>
        </imposto>
      </det>`).join('')}
      <total>
        <ICMSTot>
          <vCOFINS>${(parseFloat(nfeData.valores.totalNota) * 0.076).toFixed(2)}</vCOFINS>
          <vBCST>0.00</vBCST>
          <vICMSDeson>0.00</vICMSDeson>
          <vProd>${nfeData.valores.totalProdutos}</vProd>
          <vSeg>0.00</vSeg>
          <vFCP>0.00</vFCP>
          <vFCPST>0.00</vFCPST>
          <vNF>${nfeData.valores.totalNota}</vNF>
          <vTotTrib>0.00</vTotTrib>
          <vPIS>${(parseFloat(nfeData.valores.totalNota) * 0.0165).toFixed(2)}</vPIS>
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
      <pag>
        <detPag>
          <vPag>${nfeData.valores.totalNota}</vPag>
          <tPag>90</tPag>
        </detPag>
      </pag>
      <Id>NFe${chaveAcesso}</Id>
      <ide>
        <tpNF>1</tpNF>
        <mod>55</mod>
        <indPres>1</indPres>
        <tpImp>1</tpImp>
        <nNF>${nfeData.numero}</nNF>
        <cMunFG>3550308</cMunFG>
        <procEmi>0</procEmi>
        <finNFe>1</finNFe>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpAmb>${nfeData.ambiente === 'producao' ? '1' : '2'}</tpAmb>
        <indFinal>1</indFinal>
        <dhSaiEnt>${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}</dhSaiEnt>
        <idDest>1</idDest>
        <tpEmis>1</tpEmis>
        <cDV>1</cDV>
        <cUF>35</cUF>
        <serie>${nfeData.serie}</serie>
        <natOp>Venda de Merc Adq Receb Terceiros ST</natOp>
        <cNF>${Math.floor(Math.random() * 100000000)}</cNF>
        <verProc>12.1.2209.236</verProc>
      </ide>
      <autXML>
        <CNPJ>${nfeData.emitente.cnpj.replace(/\D/g, '')}</CNPJ>
      </autXML>
      <emit>
        <xNome>${nfeData.emitente.razaoSocial}</xNome>
        <CRT>3</CRT>
        <xFant>${nfeData.emitente.nomeFantasia}</xFant>
        <CNPJ>${nfeData.emitente.cnpj.replace(/\D/g, '')}</CNPJ>
        <enderEmit>
          <fone>${nfeData.emitente.endereco.telefone.replace(/\D/g, '')}</fone>
          <UF>${nfeData.emitente.endereco.uf}</UF>
          <xPais>Brasil</xPais>
          <cPais>1058</cPais>
          <xLgr>${nfeData.emitente.endereco.logradouro}</xLgr>
          <xMun>${nfeData.emitente.endereco.municipio}</xMun>
          <nro>${nfeData.emitente.endereco.numero}</nro>
          <cMun>3550308</cMun>
          <xBairro>${nfeData.emitente.endereco.bairro}</xBairro>
          <CEP>${nfeData.emitente.endereco.cep.replace(/\D/g, '')}</CEP>
        </enderEmit>
        <IE>${nfeData.emitente.ie}</IE>
      </emit>
      <dest>
        <xNome>${nfeData.destinatario.nome}</xNome>
        <CPF>${nfeData.destinatario.cnpj.replace(/\D/g, '')}</CPF>
        <enderDest>
          <fone>11999999999</fone>
          <UF>${nfeData.destinatario.endereco.uf}</UF>
          <xPais>Brasil</xPais>
          <cPais>1058</cPais>
          <xLgr>${nfeData.destinatario.endereco.logradouro}</xLgr>
          <xMun>${nfeData.destinatario.endereco.municipio}</xMun>
          <nro>456</nro>
          <cMun>3550308</cMun>
          <xBairro>${nfeData.destinatario.endereco.bairro}</xBairro>
          <CEP>${nfeData.destinatario.endereco.cep.replace(/\D/g, '')}</CEP>
        </enderDest>
        <indIEDest>9</indIEDest>
        <email>cliente@exemplo.com</email>
      </dest>
      <transp>
        <modFrete>0</modFrete>
        <vol>
          <marca>DIVERSOS</marca>
          <qVol>1</qVol>
          <nVol>0</nVol>
          <pesoB>10.000</pesoB>
        </vol>
        <transporta>
          <xNome>TRANSPORTADORA EXEMPLO LTDA</xNome>
          <UF>SP</UF>
          <xEnder>R. Transportadora 123 Centro</xEnder>
          <xMun>São Paulo</xMun>
          <CNPJ>12345678000195</CNPJ>
          <IE>123456789</IE>
        </transporta>
      </transp>
    </infNFe>
  </NFe>
  <versao>4.00</versao>
</nfeProc>`;
    
    return xmlContent;
  };

  const generateNfePdf = async (nfeData: any) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Cabeçalho DANFE - Exatamente como o PDF de referência
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DANFE - Documento Auxiliar da Nota Fiscal Eletrônica', 105, 15, { align: 'center' });
    
    // Informações da empresa
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(EMPRESA_CONFIG.razaoSocial, 105, 25, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(`CNPJ: ${EMPRESA_CONFIG.cnpj}`, 105, 30, { align: 'center' });
    pdf.text(`${EMPRESA_CONFIG.endereco.logradouro}, ${EMPRESA_CONFIG.endereco.numero} - ${EMPRESA_CONFIG.endereco.bairro}`, 105, 35, { align: 'center' });
    pdf.text(`${EMPRESA_CONFIG.endereco.cep} - ${EMPRESA_CONFIG.endereco.municipio} - ${EMPRESA_CONFIG.endereco.uf}`, 105, 40, { align: 'center' });
    
    // Linha separadora
    pdf.line(20, 45, 190, 45);
    
    // Informações da NF-e
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NF-e', 20, 55);
    pdf.text('N°.', 20, 60);
    pdf.text('Série', 20, 65);
    pdf.text('Data Emissão', 20, 70);
    pdf.text('Data Saída', 20, 75);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(nfeData.numero, 50, 60);
    pdf.text(nfeData.serie, 50, 65);
    pdf.text(format(new Date(nfeData.dataEmissao), 'dd/MM/yyyy HH:mm', { locale: ptBR }), 50, 70);
    pdf.text(format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: ptBR }), 50, 75);
    
    // Tipo de operação
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tipo de Operação:', 120, 55);
    pdf.setFont('helvetica', 'normal');
    pdf.text('0 - ENTRADA / 1 - SAÍDA', 120, 60);
    pdf.text('1', 120, 65);
    
    // Linha separadora
    pdf.line(20, 80, 190, 80);
    
    // Dados do destinatário
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESTINATÁRIO/REMETENTE', 20, 90);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Nome/Razão Social:', 20, 100);
    pdf.text(nfeData.destinatario.nome, 20, 105);
    pdf.text('CNPJ/CPF:', 20, 110);
    pdf.text(nfeData.destinatario.cnpj, 20, 115);
    pdf.text('Endereço:', 20, 120);
    pdf.text(nfeData.destinatario.endereco.logradouro, 20, 125);
    pdf.text('Bairro/Distrito:', 20, 130);
    pdf.text(nfeData.destinatario.endereco.bairro, 20, 135);
    pdf.text('CEP:', 20, 140);
    pdf.text(nfeData.destinatario.endereco.cep, 20, 145);
    pdf.text('Município:', 20, 150);
    pdf.text(`${nfeData.destinatario.endereco.municipio} - ${nfeData.destinatario.endereco.uf}`, 20, 155);
    
    // Linha separadora
    pdf.line(20, 160, 190, 160);
    
    // Cálculo do imposto
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CÁLCULO DO IMPOSTO', 20, 170);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Base de Cálculo ICMS:', 20, 180);
    pdf.text('0,00', 150, 180);
    pdf.text('Valor ICMS:', 20, 185);
    pdf.text('0,00', 150, 185);
    pdf.text('Valor Total Produtos:', 20, 190);
    pdf.text(`R$ ${nfeData.valores.totalProdutos}`, 150, 190);
    pdf.text('Valor Total da Nota:', 20, 195);
    pdf.text(`R$ ${nfeData.valores.totalNota}`, 150, 195);
    
    // Linha separadora
    pdf.line(20, 200, 190, 200);
    
    // Dados dos produtos
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DADOS DOS PRODUTOS/SERVIÇOS', 20, 210);
    
    // Cabeçalho da tabela
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Código', 20, 220);
    pdf.text('Descrição', 50, 220);
    pdf.text('NCM', 120, 220);
    pdf.text('CFOP', 140, 220);
    pdf.text('Un', 160, 220);
    pdf.text('Qtd', 170, 220);
    pdf.text('Vl Unit', 180, 220);
    pdf.text('Vl Total', 190, 220);
    
    // Linha da tabela
    pdf.line(20, 222, 200, 222);
    
    // Conteúdo da tabela
    pdf.setFont('helvetica', 'normal');
    let yPos = 230;
    
    nfeData.itens.forEach((item: any) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text(item.codigo, 20, yPos);
      pdf.text(item.descricao.substring(0, 20), 50, yPos);
      pdf.text(item.ncm, 120, yPos);
      pdf.text(item.cfop, 140, yPos);
      pdf.text(item.unidade, 160, yPos);
      pdf.text(item.quantidade.toString(), 170, yPos);
      pdf.text(`R$ ${item.valorUnitario}`, 180, yPos);
      pdf.text(`R$ ${item.valorTotal}`, 190, yPos);
      
      yPos += 8;
    });
    
    // Totais finais
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAIS:', 20, yPos);
    pdf.text(`Valor Total dos Produtos: R$ ${nfeData.valores.totalProdutos}`, 20, yPos + 6);
    pdf.text(`Valor Total da Nota: R$ ${nfeData.valores.totalNota}`, 20, yPos + 12);
    
    return pdf.output('blob');
  };

  const handleGenerateNfe = async () => {
    if (!sale) return;
    
    console.log('🚀 Iniciando geração de NF-e para venda:', sale.id);
    setIsGenerating(true);
    
    try {
      const nfeData = generateNfeData();
      console.log('📊 Dados da NF-e gerados:', nfeData);
      
      // Validar dados antes de enviar
      const validationErrors = validateNfeData(nfeData);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }
      
      let apiResponse = null;
      
      // Gerar NF-e localmente
      console.log('🌐 Gerando NF-e localmente...');
      const formattedData = formatNfeDataForApi(nfeData, 'local');
      
      apiResponse = await emitirNfe('local', formattedData);
      console.log('✅ NF-e gerada localmente:', apiResponse);
      
      const xmlContent = generateNfeXml(nfeData);
      const pdfBlob = await generateNfePdf(nfeData);
      
      const fileName = `NFE_${nfeData.numero}_${nfeData.serie}_${format(new Date(), 'yyyy-MM-dd')}`;
      
      setGeneratedFiles({
        pdf: pdfBlob,
        xml: xmlContent,
        fileName
      });
      
      console.log('✅ NF-e gerada com sucesso!');
      
      toast({
        title: "Sucesso",
        description: "NF-e gerada com sucesso (modo local)!"
      });
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar NF-e:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar NF-e: " + error.message,
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleDownloadPdf = () => {
    if (!generatedFiles.pdf) return;
    
    const url = URL.createObjectURL(generatedFiles.pdf);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedFiles.fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadXml = () => {
    if (!generatedFiles.xml) return;
    
    const blob = new Blob([generatedFiles.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedFiles.fileName}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenPdf = () => {
    if (!generatedFiles.pdf) return;
    
    const url = URL.createObjectURL(generatedFiles.pdf);
    window.open(url, '_blank');
  };

  const handleClose = () => {
    setGeneratedFiles({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-[1024px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1024px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 varejo-nfe-generation-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Geração de NF-e - Varejo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Configurações da NF-e */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Settings className="h-4 w-4" />
                Configurações da NF-e
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiProvider">Provedor de API</Label>
                  <Select 
                    value={nfeConfig.apiProvider} 
                    onValueChange={(value) => setNfeConfig(prev => ({ ...prev, apiProvider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NFE_APIS.map(api => (
                        <SelectItem key={api.id} value={api.id}>
                          <div>
                            <div className="font-medium">{api.name}</div>
                            <div className="text-xs text-muted-foreground">{api.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ambiente">Ambiente</Label>
                  <Select 
                    value={nfeConfig.ambiente} 
                    onValueChange={(value) => setNfeConfig(prev => ({ ...prev, ambiente: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(NFE_ENVIRONMENTS).map(env => (
                        <SelectItem key={env.id} value={env.id}>
                          <div>
                            <div className="font-medium">{env.name}</div>
                            <div className="text-xs text-muted-foreground">{env.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie">Série</Label>
                  <Input
                    id="serie"
                    value={nfeConfig.serie}
                    onChange={(e) => setNfeConfig(prev => ({ ...prev, serie: e.target.value }))}
                    placeholder="001"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numeroInicial">Número Inicial</Label>
                  <Input
                    id="numeroInicial"
                    value={nfeConfig.numeroInicial}
                    onChange={(e) => setNfeConfig(prev => ({ ...prev, numeroInicial: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
              
              {/* Modo Local Ativo */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Modo Local Ativo</AlertTitle>
                <AlertDescription className="text-green-700">
                  <p className="mb-2">
                    <strong>Modo:</strong> Geração local de NF-e para desenvolvimento
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong> Sistema funcionando em modo local
                  </p>
                  <p className="text-xs">
                    <strong>Nota:</strong> As NF-e geradas são simuladas e não têm valor fiscal.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Resumo da Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Package className="h-4 w-4" />
                Resumo da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{sale.id.slice(-8)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </div>
                
                {sale.client && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{sale.client.name}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Produtos:</h4>
                {sale.items?.slice(0, 3).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.product?.name || 'Produto não encontrado'}</span>
                    <span>{item.qty}x {formatCurrency(item.unit_price_cents)}</span>
                  </div>
                ))}
                {sale.items && sale.items.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{sale.items.length - 3} produtos adicionais
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total de produtos: {sale.items?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(sale.total_cents)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-800">Configuração de API</h4>
                  <p className="text-sm text-orange-700">
                    Para usar APIs reais de NF-e, configure suas credenciais nas variáveis de ambiente:
                    <br />
                    <code className="bg-orange-100 px-1 rounded">FISCAL_API_TOKEN</code>,
                    <code className="bg-orange-100 px-1 rounded">NFEIO_API_TOKEN</code>,
                    <code className="bg-orange-100 px-1 rounded">TECNOSPEED_API_TOKEN</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-4">
            {!generatedFiles.pdf ? (
              <Button 
                onClick={handleGenerateNfe}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando NF-e...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar NF-e
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    NF-e gerada com sucesso!
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                  <Button 
                    onClick={handleOpenPdf}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar PDF
                  </Button>
                  
                  <Button 
                    onClick={handleDownloadPdf}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  
                  <Button 
                    onClick={handleDownloadXml}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download XML
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
