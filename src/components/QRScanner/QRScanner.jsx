/**
 * QRScanner - Componente para leitura de QR Code via câmera
 * 
 * Utiliza html5-qrcode para acessar a câmera e decodificar QR codes.
 * Abre automaticamente ao montar e retorna o valor lido via callback.
 * 
 * Props:
 * - onScan: callback chamado quando QR é lido com sucesso (valor decodificado)
 * - onError: callback para erros (opcional)
 * - onClose: callback para fechar o scanner
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../';
import './QRScanner.css';

function QRScanner({ onScan, onError, onClose }) {
  const [isStarting, setIsStarting] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState('');
  
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const scannerIdRef = useRef('qr-scanner-main');
  const isScanningRef = useRef(false);
  const mountedRef = useRef(true);
  const scannerStartedRef = useRef(false);

  useEffect(() => {
    console.log('[QRScanner] Componente montado, container ID:', scannerIdRef.current);
    console.log('[QRScanner] Container element:', document.getElementById(scannerIdRef.current));
  }, []);

  useEffect(() => {
    let html5QrCode = null;
    let mounted = true;
    mountedRef.current = true;

    const startScanner = async () => {
      // Evita iniciar o scanner múltiplas vezes (problema com StrictMode)
      if (scannerStartedRef.current) {
        console.log('[QRScanner] Scanner já iniciado, pulando...');
        return;
      }

      console.log('Starting QR Scanner...');
      
      // Pequeno delay para garantir que o DOM esteja pronto
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted || !mountedRef.current) {
        console.log('[QRScanner] Componente desmontado antes de iniciar scanner');
        return;
      }
      
      try {
        // Verifica suporte básico da API de mídia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const err = new Error('API de câmera indisponível neste dispositivo/navegador');
          console.error('[QRScanner] API de mídia não suportada');
          if (mounted && mountedRef.current) {
            setErrorMsg('Câmera indisponível. Certifique-se de estar em HTTPS ou use a entrada manual.');
            setIsStarting(false);
          }
          if (onError) {
            onError(err);
          }
          return;
        }

        console.log('[QRScanner] Verificando permissões da câmera...');
        // Verifica permissão de câmera
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(track => track.stop());
        
        if (!mounted || !mountedRef.current) {
          console.log('[QRScanner] Componente desmontado durante verificação de permissões');
          return;
        }

        console.log('[QRScanner] Criando instância do scanner...');
        // Cria instância do scanner
        html5QrCode = new Html5Qrcode(scannerIdRef.current);
        scannerRef.current = html5QrCode;

        console.log('[QRScanner] ID do container:', scannerIdRef.current);
        console.log('[QRScanner] Elemento DOM existe:', document.getElementById(scannerIdRef.current));

        // Verifica se o container ainda existe
        const containerElement = document.getElementById(scannerIdRef.current);
        if (!containerElement) {
          console.error('[QRScanner] Container element não encontrado');
          if (mounted && mountedRef.current) {
            setErrorMsg('Erro interno: container não encontrado');
            setIsStarting(false);
          }
          return;
        }

        // Configuração do scanner
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        console.log('[QRScanner] Iniciando scanner...');
        // Inicia scanner com câmera traseira
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            console.log('[QRScanner] QR Code detectado:', decodedText);
            // QR lido com sucesso
            if (mounted && mountedRef.current && onScan) {
              // Vibra para feedback
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Ignora erros de leitura contínua (normal quando não há QR na tela)
            console.debug('[QRScanner] Erro de leitura (normal):', errorMessage);
          }
        );

        console.log('[QRScanner] Scanner start() completado, verificando estado...');
        console.log('[QRScanner] Estado do scanner:', html5QrCode.getState());

        // Aguardar o vídeo ser criado e aplicar estilos
        const waitForVideo = () => {
          const videoElement = document.querySelector(`#${scannerIdRef.current} video`);
          if (videoElement) {
            console.log('[QRScanner] Vídeo encontrado imediatamente após start');
            videoElement.style.width = '100%';
            videoElement.style.height = 'auto';
            videoElement.style.display = 'block';
            videoElement.style.minHeight = '200px';
            return;
          }
          
          // Se não encontrou imediatamente, tentar novamente
          setTimeout(() => {
            const videoElement = document.querySelector(`#${scannerIdRef.current} video`);
            if (videoElement) {
              console.log('[QRScanner] Vídeo encontrado após delay');
              videoElement.style.width = '100%';
              videoElement.style.height = 'auto';
              videoElement.style.display = 'block';
              videoElement.style.minHeight = '200px';
            } else {
              console.log('[QRScanner] Vídeo ainda não encontrado');
            }
          }, 100);
        };
        
        waitForVideo();

        if (mounted && mountedRef.current) {
          console.log('[QRScanner] Scanner iniciado com sucesso - chamando setIsStarting(false)');
          scannerStartedRef.current = true;
          isScanningRef.current = true;
          setIsStarting(false);
        }
      } catch (err) {
        console.error('[QRScanner] Erro ao iniciar:', err);
        if (!mounted || !mountedRef.current) return;

        setIsStarting(false);
        isScanningRef.current = false;
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          console.error('[QRScanner] Permissão negada');
          setErrorMsg('Permissão de câmera negada. Use a entrada manual.');
        } else if (err.name === 'NotFoundError') {
          console.error('[QRScanner] Nenhuma câmera encontrada');
          setErrorMsg('Nenhuma câmera encontrada. Use a entrada manual.');
        } else {
          console.error('[QRScanner] Erro desconhecido:', err.message);
          setErrorMsg(`Erro ao acessar câmera. Use a entrada manual. ${err.message}`);
        }
        
        if (onError) {
          onError(err);
        }
      }
    };

    startScanner();

    // Cleanup
    return () => {
      mounted = false;
      mountedRef.current = false;
      scannerStartedRef.current = false;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 'SCANNING' || state === 'PAUSED') {
            scannerRef.current.stop().catch((err) => {
              console.warn('[QRScanner] Erro ao parar scanner no cleanup:', err);
            });
          }
        } catch (err) {
          console.warn('[QRScanner] Erro ao parar scanner no cleanup:', err);
        }
        isScanningRef.current = false;
      }
      scannerRef.current = null;
    };
  }, [onScan, onError]);

  // Processa entrada manual
  const handleManualSubmit = () => {
    const value = manualValue.trim();
    if (value && onScan) {
      onScan(value);
    }
  };

  // Fecha scanner
  const handleClose = () => {
    console.log('handleClose called');
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 'SCANNING' || state === 'PAUSED') {
          scannerRef.current.stop().catch((err) => {
            console.warn('[QRScanner] Erro ao parar scanner:', err);
          });
        }
      } catch (err) {
        console.warn('[QRScanner] Erro ao verificar estado do scanner:', err);
      }
      isScanningRef.current = false;
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        {/* Header */}
        <div className="qr-scanner-header">
          <h3>📷 Escanear QR Code</h3>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        {/* Área do scanner */}
        <div className="qr-scanner-content">
          {isStarting && (
            <div className="scanner-loading">
              <div className="loading-spinner"></div>
              <p>Abrindo câmera...</p>
            </div>
          )}

          {/* Container da câmera */}
          <div 
            id={scannerIdRef.current} 
            ref={containerRef}
            className={`scanner-video ${isStarting || errorMsg ? 'hidden' : ''}`}
            style={{ minHeight: '200px' }}
          >
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ position: 'absolute', top: 0, left: 0, background: 'red', color: 'white', padding: '2px 4px', fontSize: '10px', zIndex: 1000 }}>
                isStarting: {isStarting ? 'true' : 'false'}, errorMsg: {errorMsg ? 'true' : 'false'}
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {errorMsg && !showManualInput && (
            <div className="scanner-error">
              <p>⚠️ {errorMsg}</p>
              <Button 
                variant="primary" 
                onClick={() => setShowManualInput(true)}
              >
                📝 Inserir Manualmente
              </Button>
            </div>
          )}

          {/* Entrada manual */}
          {showManualInput && (
            <div className="manual-input">
              <p>Cole o código abaixo:</p>
              <textarea
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Cole o código aqui..."
                rows={4}
                autoFocus
              />
              <div className="manual-input-actions">
                <Button 
                  variant="primary" 
                  onClick={handleManualSubmit}
                  disabled={!manualValue.trim()}
                >
                  Conectar
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowManualInput(false)}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com opção manual */}
        {!errorMsg && !showManualInput && !isStarting && (
          <div className="qr-scanner-footer">
            <p>Aponte para o QR Code</p>
            <button 
              className="manual-link"
              onClick={() => setShowManualInput(true)}
            >
              Não consegue escanear? Insira manualmente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRScanner;
