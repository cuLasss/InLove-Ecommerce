import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface NfeValidationErrorsProps {
  errors: string[];
  warnings?: string[];
  info?: string[];
  title?: string;
}

// Função para agrupar erros similares e reduzir redundância
function groupSimilarErrors(errors: string[]): { message: string; count: number }[] {
  const grouped = new Map<string, number>();
  
  errors.forEach(error => {
    const key = error.toLowerCase().trim();
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });
  
  return Array.from(grouped.entries()).map(([message, count]) => ({
    message: errors.find(e => e.toLowerCase().trim() === message) || message,
    count
  }));
}

export function NfeValidationErrors({ 
  errors, 
  warnings = [], 
  info = [], 
  title = "Detalhes da Validação" 
}: NfeValidationErrorsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasInfo = info.length > 0;
  const hasAnyIssues = hasErrors || hasWarnings || hasInfo;
  
  // Agrupa erros similares para reduzir redundância
  const groupedErrors = groupSimilarErrors(errors);
  const groupedWarnings = groupSimilarErrors(warnings);
  const groupedInfo = groupSimilarErrors(info);
  
  if (!hasAnyIssues) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">NF-e validada com sucesso</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-800">
                {title}
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasErrors && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {groupedErrors.length} erro(s)
                  </Badge>
                )}
                {hasWarnings && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {groupedWarnings.length} aviso(s)
                  </Badge>
                )}
                {hasInfo && (
                  <Badge variant="outline" className="text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    {groupedInfo.length} info(s)
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-orange-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Erros */}
              {hasErrors && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Erros Críticos ({groupedErrors.length})
                  </h4>
                  <ul className="space-y-1">
                    {groupedErrors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-2 border-red-300">
                        <div className="flex items-center justify-between">
                          <span>{error.message}</span>
                          {error.count > 1 && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {error.count}x
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Avisos */}
              {hasWarnings && (
                <div>
                  <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Avisos ({groupedWarnings.length})
                  </h4>
                  <ul className="space-y-1">
                    {groupedWarnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border-l-2 border-yellow-300">
                        <div className="flex items-center justify-between">
                          <span>{warning.message}</span>
                          {warning.count > 1 && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {warning.count}x
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Informações */}
              {hasInfo && (
                <div>
                  <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Informações ({groupedInfo.length})
                  </h4>
                  <ul className="space-y-1">
                    {groupedInfo.map((infoItem, index) => (
                      <li key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                        <div className="flex items-center justify-between">
                          <span>{infoItem.message}</span>
                          {infoItem.count > 1 && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {infoItem.count}x
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
