// Optimized Scanner Engine - BarcodeDetector + jsQR + ZXing para máxima compatibilidade e precisão
import jsQR from 'jsqr';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export interface ScanResult {
  raw: string;
  format: string;
}

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

// Detecção manual ULTRA ROBUSTA usando jsQR + ZXing para máxima precisão
class ManualBarcodeDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private zxingReader: BrowserMultiFormatReader;
  private lastDetectionTime: number = 0;
  private detectionInterval: number = 60; // Detectar a cada 60ms (~16 FPS) para máxima velocidade
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.zxingReader = new BrowserMultiFormatReader();
    console.log('[ManualBarcodeDetector] ✅ Detector manual inicializado com jsQR + ZXing');
  }
  
  async detect(video: HTMLVideoElement): Promise<any[]> {
    const now = Date.now();
    
    // Limitar frequência de detecção para melhor performance
    if (now - this.lastDetectionTime < this.detectionInterval) {
      return [];
    }
    
    if (!video.videoWidth || !video.videoHeight || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return [];
    }
    
    try {
      // Usar resolução completa para melhor detecção de QR
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      
      // Desenhar frame do vídeo no canvas
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      
      this.lastDetectionTime = now;
      
      // Primeira tentativa: jsQR (otimizado para QR codes)
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth", // Tentar ambas inversões para melhor detecção
      });
      
      if (qrCode && qrCode.data) {
        console.log('[ManualBarcodeDetector] ✅ QR Code detectado (jsQR):', qrCode.data);
        return [{
          rawValue: qrCode.data,
          format: 'qr_code'
        }];
      }
      
      // Segunda tentativa: ZXing (detecta QR + códigos de barras)
      try {
        const result = await this.zxingReader.decodeFromCanvas(this.canvas);
        if (result && result.getText()) {
          console.log('[ManualBarcodeDetector] ✅ Código detectado (ZXing):', result.getText(), '- Formato:', result.getBarcodeFormat());
          return [{
            rawValue: result.getText(),
            format: result.getBarcodeFormat().toString().toLowerCase()
          }];
        }
      } catch (zxingError) {
        // ZXing lança exceção quando não encontra nada, é normal
        if (!(zxingError instanceof NotFoundException)) {
          console.warn('[ManualBarcodeDetector] Erro ZXing:', zxingError);
        }
      }
      
      return [];
    } catch (error) {
      console.warn('[ManualBarcodeDetector] Erro na detecção:', error);
      return [];
    }
  }
  

}

class ScannerEngine {
  private static instance: ScannerEngine | null = null;
  
  // Estado da câmera
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private rafId: number = 0;
  private running: boolean = false;
  private detecting: boolean = false;
  
  // Estado da detecção otimizada
  private lastFrameCode: string | null = null;
  private stableCount: number = 0;
  private lastConfirmCode: string | null = null;
  private lastConfirmAt: number = 0;
  
  // Constantes otimizadas para mobile - ULTRA AFIADAS
  private readonly STABILITY_FRAMES = 1; // Detecção instantânea - sem espera
  private readonly COOLDOWN_MS = 150; // Cooldown ultra-rápido entre detecções
  private readonly SAME_CODE_BURST_MS = 2000; // Permite releituras muito rápidas
  private readonly MOBILE_DETECTION_INTERVAL = 60; // Intervalo ultra-agressivo para mobile (16 FPS)
  private readonly DESKTOP_DETECTION_INTERVAL = 80; // Intervalo ultra-agressivo para desktop
  
  // Detecção direta no video (sem ROI canvas para máxima performance)
  private detector: any = null;
  private manualDetector: ManualBarcodeDetector | null = null;
  private useManualDetection: boolean = false;
  
  // Flash/Torch
  private torchState: boolean = false;
  private torchSupported: boolean = false;
  
  static getInstance(): ScannerEngine {
    if (!ScannerEngine.instance) {
      ScannerEngine.instance = new ScannerEngine();
    }
    return ScannerEngine.instance;
  }
  
  private constructor() {
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.muted = true;
    
    // Pausar detecção quando aba não está visível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.pauseDetection();
        if (this.torchState) {
          this.toggleTorch(false);
        }
      } else if (this.stream && this.running) {
        this.resumeDetection();
      }
    });
  }
  
  async open(): Promise<void> {
    if (this.stream) {
      console.log('[ScannerEngine] Stream já aberta, reutilizando');
      return;
    }
    
    if (!navigator.mediaDevices || !window.isSecureContext) {
      throw new Error('Câmera requer HTTPS ou localhost');
    }

    // Verificar suporte ao BarcodeDetector
    const hasNativeDetector = !!window.BarcodeDetector;
    
    if (!hasNativeDetector) {
      console.log('[ScannerEngine] BarcodeDetector nativo não disponível, usando detecção manual');
      this.useManualDetection = true;
      this.manualDetector = new ManualBarcodeDetector();
    } else {
      console.log('[ScannerEngine] Usando BarcodeDetector nativo');
      this.useManualDetection = false;
    }
    
    try {
      console.log('[ScannerEngine] Abrindo câmera...');
      
      // Detectar se é mobile para otimizações específicas
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       window.innerWidth <= 768;
      
      // Configurações ULTRA OTIMIZADAS para QR de perto e longe - máxima precisão
      const videoConstraints: MediaTrackConstraints = {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, max: 1920 },  // Full HD para máxima nitidez
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 },  // 30 FPS para fluidez
        // @ts-ignore - Configurações avançadas para auto-foco rápido e precisão
        focusMode: 'continuous',      // Auto-foco contínuo
        // @ts-ignore
        focusDistance: 0,             // Foco automático
        // @ts-ignore
        whiteBalanceMode: 'continuous', // Balanço de branco automático
        // @ts-ignore
        exposureMode: 'continuous',    // Exposição automática
        // @ts-ignore
        brightness: { ideal: 1.2 },    // Aumentar brilho para melhor leitura
        // @ts-ignore
        contrast: { ideal: 1.1 },      // Aumentar contraste
        // @ts-ignore
        torch: false
      };
      
      // Tentar com constraints completas primeiro
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      } catch (error) {
        console.warn('[ScannerEngine] Constraints completas falharam, tentando básicas...');
        // Fallback para constraints mais simples
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: isMobile ? 1280 : 1920 },
            height: { ideal: isMobile ? 720 : 1080 }
          },
          audio: false
        });
      }
      
      if (!this.video) {
        throw new Error('Video element não disponível');
      }
      
      this.video.srcObject = this.stream;
      
      await new Promise<void>((resolve, reject) => {
        if (!this.video) {
          reject(new Error('Video element perdido'));
          return;
        }
        
        const onCanPlay = () => {
          this.video?.removeEventListener('canplay', onCanPlay);
          this.video?.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = () => {
          this.video?.removeEventListener('canplay', onCanPlay);
          this.video?.removeEventListener('error', onError);
          reject(new Error('Erro ao carregar vídeo'));
        };
        
        this.video.addEventListener('canplay', onCanPlay);
        this.video.addEventListener('error', onError);
      });
      
      await this.video.play();
      console.log('[ScannerEngine] Câmera iniciada com sucesso');
      
      // Inicializar controle de torch
      await this.initTorchCapabilities();
      
    } catch (error) {
      console.error('[ScannerEngine] Erro ao abrir câmera:', error);
      this.close();
      throw error;
    }
  }
  
  private async initTorchCapabilities(): Promise<void> {
    if (!this.stream) return;
    
    try {
      const track = this.stream.getVideoTracks()[0];
      
      // Verificar capacidades de torch
      if (track.getCapabilities) {
        const capabilities = track.getCapabilities() as any;
        this.torchSupported = !!capabilities.torch;
      }
      
      console.log('[ScannerEngine] Torch suportado:', this.torchSupported);
    } catch (error) {
      console.warn('[ScannerEngine] Erro ao verificar capacidades de torch:', error);
      this.torchSupported = false;
    }
  }
  
  close(): void {
    console.log('[ScannerEngine] Fechando câmera...');
    
    this.running = false;
    this.detecting = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    
    // SEMPRE desligar flash ao fechar
    if (this.torchState) {
      this.toggleTorch(false);
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[ScannerEngine] Track parado:', track.kind);
      });
      this.stream = null;
    }
    
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      // Remover event listeners se houver
      this.video.removeEventListener('loadeddata', () => {});
      this.video.removeEventListener('error', () => {});
    }
    
    this.detector = null;
    this.manualDetector = null;
    
    // Reset estado de detecção
    this.lastFrameCode = null;
    this.stableCount = 0;
    this.torchState = false;
    this.torchSupported = false;
    
    console.log('[ScannerEngine] Câmera fechada e recursos limpos');
  }
  
  async startDetect(onDetect: (code: string) => void): Promise<void> {
    if (this.detecting) {
      console.log('[ScannerEngine] Detecção já em execução');
      return;
    }
    
    if (!this.video || !this.stream) {
      throw new Error('Câmera não está aberta');
    }

    // Aguardar o vídeo estar pronto antes de iniciar detecção
    if (this.video.readyState < 2) {
      console.log('[ScannerEngine] Aguardando vídeo carregar...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout aguardando vídeo carregar'));
        }, 5000);
        
        const handleLoadedData = () => {
          clearTimeout(timeout);
          this.video?.removeEventListener('loadeddata', handleLoadedData);
          resolve(void 0);
        };
        
        this.video?.addEventListener('loadeddata', handleLoadedData);
      });
    }

    this.running = true;
    this.detecting = true;
    
    if (this.useManualDetection) {
      // Usar detecção manual para navegadores sem BarcodeDetector
      console.log('[ScannerEngine] Inicializando detecção manual...');
      this.detector = this.manualDetector;
    } else {
      // Usar BarcodeDetector nativo
      console.log('[ScannerEngine] Inicializando BarcodeDetector (códigos de barras e QR codes)...');
      this.detector = new window.BarcodeDetector({
        formats: [
          'qr_code',
          'ean_13', 
          'ean_8',
          'code_128', 
          'code_39',
          'code_93',
          'itf',
          'upc_a', 
          'upc_e',
          'data_matrix',
          'pdf417',
          'aztec'
        ]
      });
    }
    
    console.log('[ScannerEngine] Iniciando detecção otimizada...');
    this.detect(onDetect);
  }
  private detect(onDetect: (code: string) => void): void {
    if (!this.running || !this.detecting) return;
    
    // Detectar se é mobile para usar intervalo otimizado
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
    
    // Usar setTimeout com intervalo otimizado para mobile em vez de requestAnimationFrame
    const interval = isMobile ? this.MOBILE_DETECTION_INTERVAL : this.DESKTOP_DETECTION_INTERVAL;
    
    setTimeout(() => {
      this.processFrame(onDetect);
      this.detect(onDetect);
    }, interval);
  }
  
  private async processFrame(onDetect: (code: string) => void): Promise<void> {
    if (!this.video || !this.running || !this.detecting || !this.detector) return;
    
    try {
      // Detecção direta no elemento video para máxima performance
      const barcodes = await this.detector.detect(this.video);
      
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        console.log('[ScannerEngine] 🎯 Código bruto detectado:', code);
        this.handleDetectedCode(code, onDetect);
      } else {
        // Reset se não encontrou nada
        this.lastFrameCode = null;
        this.stableCount = 0;
      }
    } catch (error) {
      // Silenciar erros normais de detecção para manter fluidez
      console.warn('[ScannerEngine] Erro na detecção:', error);
    }
  }
  
  private handleDetectedCode(code: string, onDetect: (code: string) => void): void {
    const now = Date.now();
    
    if (code === this.lastFrameCode) {
      this.stableCount++;
    } else {
      this.lastFrameCode = code;
      this.stableCount = 1;
    }
    
    console.log('[ScannerEngine] 📊 stableCount:', this.stableCount, '/ STABILITY_FRAMES:', this.STABILITY_FRAMES);
    
    // Detecção mais rápida com menos frames de estabilidade
    if (this.stableCount >= this.STABILITY_FRAMES) {
      const candidate = code;
      
      console.log('[ScannerEngine] ✓ Código estável, verificando cooldown...');
      console.log('[ScannerEngine] lastConfirmCode:', this.lastConfirmCode, '/ candidate:', candidate);
      
      // Cooldown apenas para códigos diferentes
      if (this.lastConfirmCode !== candidate) {
        const timeSinceLastConfirm = now - this.lastConfirmAt;
        console.log('[ScannerEngine] Tempo desde última confirmação:', timeSinceLastConfirm, 'ms / Cooldown:', this.COOLDOWN_MS, 'ms');
        
        if (timeSinceLastConfirm >= this.COOLDOWN_MS) {
          console.log('[ScannerEngine] 🚀 ENVIANDO CÓDIGO PARA CALLBACK:', candidate);
          onDetect(candidate);
          this.lastConfirmCode = candidate;
          this.lastConfirmAt = now;
          
          // Reset para próxima detecção
          this.lastFrameCode = null;
          this.stableCount = 0;
        }
      }
    }
  }
  
  private pauseDetection(): void {
    this.detecting = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
  
  private resumeDetection(): void {
    if (!this.detecting && this.stream) {
      this.detecting = true;
    }
  }
  
  // Controle de torch otimizado
  async toggleTorch(on?: boolean): Promise<boolean> {
    if (!this.stream || !this.torchSupported) return false;
    
    const targetState = on !== undefined ? on : !this.torchState;
    
    try {
      const track = this.stream.getVideoTracks()[0];
      
      await track.applyConstraints({
        advanced: [{ torch: targetState } as any]
      });
      
      this.torchState = targetState;
      console.log('[ScannerEngine] Torch', targetState ? 'ligado' : 'desligado');
      return targetState;
    } catch (error) {
      console.warn('[ScannerEngine] Erro ao alternar lanterna:', error);
      return this.torchState;
    }
  }
  
  getTorchSupported(): boolean {
    return this.torchSupported;
  }
  
  getTorchState(): boolean {
    return this.torchState;
  }
  
  async setZoom(value: number): Promise<void> {
    if (!this.stream) return;
    
    try {
      const track = this.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      
      if (capabilities?.zoom) {
        await track.applyConstraints({
          advanced: [{ zoom: value } as any]
        });
      }
    } catch (error) {
      console.warn('[ScannerEngine] Erro ao ajustar zoom:', error);
    }
  }
  
  async tapToFocus(): Promise<void> {
    if (!this.stream) return;
    
    try {
      const track = this.stream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ focusMode: 'single-shot' } as any]
      });
    } catch (error) {
      console.warn('[ScannerEngine] Erro ao focar:', error);
    }
  }
  
  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }
  
  getLastConfirmCode(): string | null {
    return this.lastConfirmCode;
  }
  
  canRepeatLast(): boolean {
    const now = Date.now();
    return this.lastConfirmCode !== null && 
           (now - this.lastConfirmAt) < this.SAME_CODE_BURST_MS;
  }
  
  getDetectorInfo(): string {
    if (this.useManualDetection) {
      return 'Detecção manual (Opera GX/fallback)';
    }
    return 'BarcodeDetector nativo (códigos de barras e QR codes)';
  }
  
  // Repetir último código detectado
  addLastCode(onDetect: (code: string) => void): boolean {
    if (!this.canRepeatLast()) return false;
    
    const now = Date.now();
    if (now - this.lastConfirmAt >= this.COOLDOWN_MS) {
      onDetect(this.lastConfirmCode!);
      this.lastConfirmAt = now;
      return true;
    }
    return false;
  }
}

export default ScannerEngine.getInstance();