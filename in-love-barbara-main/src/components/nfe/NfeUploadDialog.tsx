import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';

interface NfeUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}

export function NfeUploadDialog({ 
  isOpen, 
  onOpenChange, 
  onFilesSelected, 
  isUploading 
}: NfeUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const xmlFiles = files.filter(file => file.name.toLowerCase().endsWith('.xml'));
    
    if (xmlFiles.length !== files.length) {
      // Há arquivos que não são XML
      console.warn('Alguns arquivos não são XML e foram ignorados');
    }
    
    setSelectedFiles(xmlFiles);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const xmlFiles = files.filter(file => file.name.toLowerCase().endsWith('.xml'));
    setSelectedFiles(xmlFiles);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-4 xl:p-6">
        <DialogHeader className="pb-3 xl:pb-4">
          <DialogTitle className="text-base xl:text-lg break-words leading-tight">
            Importar Notas Fiscais (XML)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 xl:space-y-4">
          {/* Área de drag-drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 xl:p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-6 w-6 xl:h-8 xl:w-8 text-muted-foreground mb-2" />
            <p className="text-xs xl:text-sm text-muted-foreground mb-2 break-words">
              Arraste arquivos XML (.xml) aqui ou clique para selecionar
            </p>
            <Button 
              type="button" 
              variant="outline" 
              className="pointer-events-none text-xs xl:text-sm"
            >
              Selecionar Arquivos XML
            </Button>
            <Input
              id="xml-files"
              type="file"
              accept=".xml,application/xml,text/xml"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Lista de arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs xl:text-sm font-medium">
                Arquivos selecionados ({selectedFiles.length})
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded text-xs xl:text-sm"
                  >
                    <span className="break-words flex-1 min-w-0 leading-tight">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                      className="flex-shrink-0 h-6 w-6 xl:h-8 xl:w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status de processamento */}
          {isUploading && (
            <div className="text-center py-3 xl:py-4">
              <div className="text-xs xl:text-sm text-muted-foreground">
                Processando arquivos XML...
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
              className="text-xs xl:text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="text-xs xl:text-sm"
            >
              {isUploading ? 'Processando...' : `Importar ${selectedFiles.length} arquivo(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}