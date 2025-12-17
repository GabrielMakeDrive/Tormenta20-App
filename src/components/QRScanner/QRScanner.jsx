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
  const [hasPermission, setHasPermission] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState('');
  
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const scannerIdRef = useRef(`qr-scanner-${Date.now()}`);

  useEffect(() => {
    let html5QrCode = null;
    let mounted = true;

    const startScanner = async () => {
      try {
        // Verifica suporte básico da API de mídia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const err = new Error('API de câmera indisponível neste dispositivo/navegador');
          setHasPermission(false);
          setErrorMsg('Câmera indisponível. Certifique-se de estar em HTTPS ou use a entrada manual.');
          setIsStarting(false);
          if (onError) {
            onError(err);
          }
          return;
        }

        // Verifica permissão de câmera
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(track => track.stop());
        
        if (!mounted) return;
        setHasPermission(true);

        // Cria instância do scanner
        html5QrCode = new Html5Qrcode(scannerIdRef.current);
        scannerRef.current = html5QrCode;

        // Configuração do scanner
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Inicia scanner com câmera traseira
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // QR lido com sucesso
            if (mounted && onScan) {
              // Vibra para feedback
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Ignora erros de leitura contínua (normal quando não há QR na tela)
          }
        );

        if (mounted) {
          setIsStarting(false);
        }
      } catch (err) {
        console.error('[QRScanner] Erro ao iniciar:', err);
        if (!mounted) return;

        setIsStarting(false);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setHasPermission(false);
          setErrorMsg('Permissão de câmera negada. Use a entrada manual.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('Nenhuma câmera encontrada. Use a entrada manual.');
        } else {
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
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
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
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
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
          />

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
