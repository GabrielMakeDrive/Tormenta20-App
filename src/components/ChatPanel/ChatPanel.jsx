/**
 * ChatPanel - Componente de Chat Reutilizável
 * 
 * Exibe uma interface de chat com histórico de mensagens e campo de input.
 * Usado tanto pelo Mestre (para conversar com jogadores individuais) quanto
 * pelo Jogador (para conversar com o Mestre).
 * 
 * Props:
 * - messages: Array de mensagens [{id, text, senderName, senderIcon, timestamp, isOwn}]
 * - onSendMessage: Callback(text) chamado ao enviar mensagem
 * - recipientName: Nome do destinatário (exibido no header)
 * - recipientIcon: Ícone do destinatário
 * - isOpen: Controla visibilidade do painel
 * - onClose: Callback para fechar o painel
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../';
import './ChatPanel.css';

/**
 * Formata timestamp para exibição (HH:MM)
 */
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

function ChatPanel({
    messages = [],
    onSendMessage,
    recipientName = 'Destinatário',
    recipientIcon = '💬',
    isOpen = false,
    onClose
}) {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll para mensagem mais recente
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Foca no input ao abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = () => {
        const text = inputText.trim();
        if (!text) return;

        onSendMessage?.(text);
        setInputText('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="chat-panel">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-recipient">
                    <span className="chat-recipient-icon">{recipientIcon}</span>
                    <span className="chat-recipient-name">{recipientName}</span>
                </div>
                <button className="chat-close-btn" onClick={onClose} aria-label="Fechar chat">
                    ✕
                </button>
            </div>

            {/* Mensagens */}
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <span className="chat-empty-icon">💬</span>
                        <p>Nenhuma mensagem ainda</p>
                        <p className="chat-empty-hint">Envie a primeira mensagem!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`chat-message ${msg.isOwn ? 'own' : 'received'}`}
                        >
                            {!msg.isOwn && (
                                <span className="chat-message-icon">{msg.senderIcon}</span>
                            )}
                            <div className="chat-message-content">
                                {!msg.isOwn && (
                                    <span className="chat-message-sender">{msg.senderName}</span>
                                )}
                                <p className="chat-message-text">{msg.text}</p>
                                <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-container">
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    placeholder="Digite sua mensagem..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={500}
                />
                <Button
                    variant="primary"
                    size="small"
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                >
                    Enviar
                </Button>
            </div>
        </div>
    );
}

export default ChatPanel;
