---
applyTo: "**/styles/**"
---
# Estilos Globais - Instruções

## Propósito
Sistema de design consistente para todo o aplicativo, com tema escuro padrão e variáveis CSS reutilizáveis.

## Localização
`src/styles/global.css`

---

## Variáveis CSS (CSS Custom Properties)

### Cores Primárias
```css
--primary-color: #7c4dff;      /* Roxo principal */
--primary-dark: #651fff;        /* Hover/Active */
--primary-light: rgba(124, 77, 255, 0.15); /* Backgrounds sutis */
```

### Cores de Fundo
```css
--background-color: #121212;   /* Fundo principal (dark) */
--surface-color: #1e1e1e;      /* Cards, modais */
--hover-color: #2a2a2a;        /* Estado hover */
```

### Cores de Texto
```css
--text-primary: #ffffff;       /* Títulos, texto principal */
--text-secondary: #9e9e9e;     /* Descrições, labels */
```

### Cores de Borda
```css
--border-color: #333333;       /* Bordas, divisores */
```

### Cores de Status
```css
--success-color: #4caf50;      /* Verde - sucesso */
--danger-color: #f44336;       /* Vermelho - erro/perigo */
--warning-color: #ff9800;      /* Laranja - aviso */
--info-color: #2196f3;         /* Azul - informação */
```

### Espaçamentos
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

### Border Radius
```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
```

---

## Tema Claro
Ativado via `[data-theme="light"]` no root.

```css
[data-theme="light"] {
  --background-color: #f5f5f5;
  --surface-color: #ffffff;
  --hover-color: #eeeeee;
  --text-primary: #212121;
  --text-secondary: #757575;
  --border-color: #e0e0e0;
}
```

---

## Layout de Página

### Container Principal
```css
.page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
```

### Conteúdo
```css
.page-content {
  flex: 1;
  padding: 16px;
  padding-top: 70px;      /* Espaço para header fixo */
  padding-bottom: 80px;   /* Espaço para bottom nav */
  overflow-y: auto;
}
```

---

## Responsividade

### Mobile First
Design padrão é para mobile (< 600px).

### Tablet/Desktop
```css
@media (min-width: 600px) {
  .page-content {
    max-width: 600px;
    margin: 0 auto;
  }
}
```

---

## Animações Disponíveis

### fadeIn
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### slideUp
```css
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### pulse
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### Classes Utilitárias
```css
.animate-fade-in { animation: fadeIn 0.3s ease; }
.animate-slide-up { animation: slideUp 0.3s ease; }
```

---

## Scrollbar Customizada
```css
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}
```

---

## Safe Areas (Notch)
```css
--safe-area-top: env(safe-area-inset-top);
--safe-area-bottom: env(safe-area-inset-bottom);
```

Usado em:
- Header padding-top
- BottomNav padding-bottom

---

## Reset CSS
- Box-sizing: border-box global
- Margin/padding zerados
- List-style removido
- Tap highlight transparente
- Overscroll behavior: none

---

## Tipografia
```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 
               'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

---

## Boas Práticas

1. **Use variáveis**: Nunca hardcode cores
2. **Mobile first**: Comece pelo mobile, adicione media queries
3. **Consistência**: Siga o sistema de espaçamento
4. **Acessibilidade**: Mantenha contraste adequado
5. **Performance**: Prefira transform/opacity para animações
