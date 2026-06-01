import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Palette, Pipette } from "lucide-react"
import { cn } from "@/lib/utils"
import { PASTEL_PALETTE, resolveColor, isLightColor } from "@/lib/color-utils"

interface ColorPickerProps {
  value?: string | null
  onChange?: (color: string) => void
  placeholder?: string
  className?: string
}

export function ColorPicker({ value, onChange, placeholder = "Digite uma cor...", className }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value || "")
  const [resolvedColor, setResolvedColor] = useState<string | null>(null)
  const [recentColors, setRecentColors] = useState<string[]>([])

  // Load recent colors from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('color-picker-recent')
    if (saved) {
      try {
        setRecentColors(JSON.parse(saved))
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [])

  // Resolve color when input changes
  useEffect(() => {
    if (inputValue) {
      const resolved = resolveColor(inputValue)
      setResolvedColor(resolved)
    } else {
      setResolvedColor(null)
    }
  }, [inputValue])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange?.(newValue)
  }

  const handleColorSelect = (color: string) => {
    setInputValue(color)
    onChange?.(color)
    
    // Add to recent colors
    const updated = [color, ...recentColors.filter(c => c !== color)].slice(0, 8)
    setRecentColors(updated)
    localStorage.setItem('color-picker-recent', JSON.stringify(updated))
  }

  const displayColor = resolvedColor || (inputValue.startsWith('#') ? inputValue : null)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="pr-12"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Cores sugeridas</Label>
                <div className="grid grid-cols-6 gap-2">
                  {PASTEL_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className="w-8 h-8 rounded border-2 border-gray-300 hover:border-primary transition-colors"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {recentColors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Cores recentes</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {recentColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className="w-6 h-6 rounded border border-gray-300 hover:border-primary transition-colors"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium mb-2 block">Seletor manual</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    placeholder="#FF0000"
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
                        handleColorSelect(value)
                      }
                    }}
                    className="flex-1 text-sm"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Color preview */}
        {displayColor && (
          <div 
            className="w-10 h-10 rounded border-2 border-gray-300 shrink-0 flex items-center justify-center"
            style={{ backgroundColor: displayColor }}
            title={`Cor: ${inputValue}`}
          >
            {isLightColor(displayColor) && (
              <div className="w-full h-full rounded bg-black opacity-10" />
            )}
          </div>
        )}
      </div>

      {/* Preview badge */}
      {displayColor && (
        <div className="flex items-center gap-2">
          <Badge 
            style={{ 
              backgroundColor: displayColor,
              color: isLightColor(displayColor) ? '#000000' : '#FFFFFF'
            }}
          >
            Preview
          </Badge>
          <span className="text-sm text-muted-foreground">
            {displayColor}
          </span>
        </div>
      )}
    </div>
  )
}