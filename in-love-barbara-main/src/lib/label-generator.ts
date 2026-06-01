import jsPDF from 'jspdf'
import QRCode from 'qrcode'

const generateQRCode = async (text: string): Promise<string> => {
  return QRCode.toDataURL(text, { width: 200 })
}

export interface LabelData {
  shortCode: string
  price: number
  size: string
  brand: string
  qrCode?: string
}

export interface LabelOptions {
  format: 'pdf' | 'zpl'
  width: number // mm
  height: number // mm
  columns: number
}

export class LabelGenerator {
  private options: LabelOptions

  constructor(options: LabelOptions = {
    format: 'pdf',
    width: 30,
    height: 40,
    columns: 3
  }) {
    this.options = options
  }

  async generatePDF(labels: LabelData[]): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const labelWidth = this.options.width
    const labelHeight = this.options.height
    const columns = this.options.columns
    const margin = 5

    // Calculate label spacing
    const spacingX = (pageWidth - (columns * labelWidth) - (2 * margin)) / (columns - 1)
    const spacingY = 5

    let currentX = margin
    let currentY = margin
    let currentColumn = 0
    let pageCount = 0

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]

      // Generate QR code if not provided
      if (!label.qrCode) {
        label.qrCode = await generateQRCode(label.shortCode)
      }

      // Add new page if needed (except for first page)
      if (currentY + labelHeight > pageHeight - margin && pageCount > 0) {
        pdf.addPage()
        currentY = margin
        currentColumn = 0
        currentX = margin
      }

      // Draw label
      await this.drawLabel(pdf, label, currentX, currentY, labelWidth, labelHeight)

      // Move to next position
      currentColumn++
      if (currentColumn >= columns) {
        currentColumn = 0
        currentX = margin
        currentY += labelHeight + spacingY
      } else {
        currentX += labelWidth + spacingX
      }

      pageCount++
    }

    return pdf.output('blob')
  }

  private async drawLabel(
    pdf: jsPDF, 
    label: LabelData, 
    x: number, 
    y: number, 
    width: number, 
    height: number
  ): Promise<void> {
    // Draw border (optional, for debugging)
    // pdf.rect(x, y, width, height)

    // QR Code (20x20mm)
    const qrSize = 20
    const qrX = x + (width - qrSize) / 2
    const qrY = y + 2

    if (label.qrCode) {
      pdf.addImage(label.qrCode, 'PNG', qrX, qrY, qrSize, qrSize)
    }

    // Text below QR code
    const textY = qrY + qrSize + 2
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')

    // Short code
    const shortCodeY = textY
    pdf.text(label.shortCode, x + width/2, shortCodeY, { align: 'center' })

    // Price
    const priceY = shortCodeY + 3
    const priceText = `P=R$${label.price.toFixed(2)}`
    pdf.text(priceText, x + width/2, priceY, { align: 'center' })

    // Size
    const sizeY = priceY + 3
    const sizeText = `T=${label.size}`
    pdf.text(sizeText, x + width/2, sizeY, { align: 'center' })

    // Brand
    const brandY = sizeY + 3
    const brandText = `M=${label.brand}`
    pdf.text(brandText, x + width/2, brandY, { align: 'center' })
  }

  generateZPL(labels: LabelData[]): string {
    let zpl = '^XA\n' // Start format
    
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]
      
      // Start label
      zpl += '^FO50,50\n' // Field origin
      
      // QR Code
      zpl += `^BQN,2,8\n`
      zpl += `^FD${label.shortCode}^FS\n`
      
      // Short code text
      zpl += '^FO50,200\n'
      zpl += '^A0N,25,25\n'
      zpl += `^FD${label.shortCode}^FS\n`
      
      // Price
      zpl += '^FO50,240\n'
      zpl += '^A0N,20,20\n'
      zpl += `^FDP=R$${label.price.toFixed(2)}^FS\n`
      
      // Size
      zpl += '^FO50,270\n'
      zpl += '^A0N,20,20\n'
      zpl += `^FDT=${label.size}^FS\n`
      
      // Brand
      zpl += '^FO50,300\n'
      zpl += '^A0N,20,20\n'
      zpl += `^FDM=${label.brand}^FS\n`
      
      // End label if not last
      if (i < labels.length - 1) {
        zpl += '^XZ\n^XA\n' // End current, start new
      }
    }
    
    zpl += '^XZ\n' // End format
    
    return zpl
  }

  generateTSPL(labels: LabelData[]): string {
    let tspl = 'SIZE 30 mm, 40 mm\n'
    tspl += 'SPEED 4\n'
    tspl += 'DENSITY 8\n'
    tspl += 'DIRECTION 1\n'
    tspl += 'SET RIBBON ON\n'
    tspl += 'REFERENCE 0,0\n'
    tspl += 'OFFSET 0\n'
    tspl += 'CLS\n'

    for (const label of labels) {
      // QR Code
      tspl += `QRCODE 50,50,M,8,A,0,"${label.shortCode}"\n`
      
      // Short code
      tspl += `TEXT 50,200,"3",0,1,1,"${label.shortCode}"\n`
      
      // Price
      tspl += `TEXT 50,240,"2",0,1,1,"P=R$${label.price.toFixed(2)}"\n`
      
      // Size
      tspl += `TEXT 50,270,"2",0,1,1,"T=${label.size}"\n`
      
      // Brand
      tspl += `TEXT 50,300,"2",0,1,1,"M=${label.brand}"\n`
      
      tspl += 'PRINT 1,1\n'
    }

    return tspl
  }
}

// Utility function to download file
export const downloadFile = (content: string | Blob, filename: string, mimeType: string): void => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}