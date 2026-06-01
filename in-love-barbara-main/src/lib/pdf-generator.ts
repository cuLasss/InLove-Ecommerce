import jsPDF from 'jspdf'

export interface ConsignacaoData {
  id: string
  client: {
    name: string
  }
  representative_name: string
  city: string
  commission_default_percent: number
  created_at: string
  items: Array<{
    products: {
      name: string
    }
    unit_price_cents: number
    commission_percent: number
    qty: number
  }>
}

export const generateConsignacaoPDF = async (data: ConsignacaoData): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  // Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FOLHA DE CONSIGNAÇÃO', 105, 20, { align: 'center' })
  
  // Company info
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text('IN LOVE MODA ÍNTIMA LTDA', 105, 30, { align: 'center' })
  pdf.text('CNPJ: configurar no ambiente fiscal', 105, 36, { align: 'center' })
  
  // Date and location
  const date = new Date(data.created_at).toLocaleDateString('pt-BR')
  pdf.text(`Data: ${date}`, 20, 50)
  pdf.text(`Cidade: ${data.city}`, 20, 56)
  pdf.text(`Representante: ${data.representative_name}`, 20, 62)
  
  // Client info
  pdf.text(`Cliente: ${data.client.name}`, 20, 75)
  pdf.text(`Comissão Padrão: ${data.commission_default_percent}%`, 20, 81)
  
  // Table headers
  const startY = 95
  pdf.setFont('helvetica', 'bold')
  pdf.text('Nome', 20, startY)
  pdf.text('Preço', 120, startY)
  pdf.text('% Comissão', 145, startY)
  pdf.text('Devolvidos', 175, startY)
  pdf.text('Vendidos', 190, startY)
  pdf.text('Total', 205, startY)
  
  // Line under headers
  pdf.line(20, startY + 2, 210, startY + 2)
  
  // Table content
  let currentY = startY + 8
  pdf.setFont('helvetica', 'normal')
  
  data.items.forEach((item) => {
    if (currentY > 270) { // New page if needed
      pdf.addPage()
      currentY = 20
    }
    
    pdf.text(item.products.name.substring(0, 25), 20, currentY)
    pdf.text(`R$ ${(item.unit_price_cents / 100).toFixed(2)}`, 120, currentY)
    pdf.text(`${item.commission_percent || data.commission_default_percent}%`, 145, currentY)
    pdf.text('____', 175, currentY) // Empty field for manual filling
    pdf.text('____', 190, currentY) // Empty field for manual filling
    pdf.text('____', 205, currentY) // Empty field for manual filling
    
    currentY += 6
  })
  
  // Add 2 empty lines
  for (let i = 0; i < 2; i++) {
    pdf.text('________________________________', 20, currentY)
    pdf.text('_______', 120, currentY)
    pdf.text('____', 145, currentY)
    pdf.text('____', 175, currentY)
    pdf.text('____', 190, currentY)
    pdf.text('____', 205, currentY)
    currentY += 6
  }
  
  // Footer
  currentY += 10
  pdf.text('Assinatura do Cliente: _________________________________', 20, currentY)
  currentY += 10
  pdf.text('Assinatura do Representante: _________________________________', 20, currentY)
  
  return pdf.output('blob')
}

export const downloadPDF = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const openPDFInNewTab = (blob: Blob): void => {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
