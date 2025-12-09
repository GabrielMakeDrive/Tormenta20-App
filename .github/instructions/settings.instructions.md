# Configurações - Instruções
---
applyTo: "**/pages/Settings/**"
---

## Propósito
Tela de configurações do aplicativo com opções de personalização, backup de dados e informações do app.

## Localização
`src/pages/Settings/Settings.jsx`

## Funcionalidades

### 1. Aparência
- **Tema Escuro**: Toggle on/off
  - Padrão: ativado (dark)
  - Alternativa: tema claro (light)
  - Salva preferência no localStorage

### 2. Feedback
- **Vibração**: Toggle para feedback tátil
  - Usado ao rolar dados
  - Depende de suporte do dispositivo

### 3. Gestão de Dados

#### Exportar Dados
- Gera arquivo JSON com backup completo
- Inclui: personagens, histórico, configurações
- Nome do arquivo: `tormenta20-backup-YYYY-MM-DD.json`
- Download automático via blob URL

#### Importar Dados
- Aceita arquivo .json
- Valida estrutura do arquivo
- Substitui dados existentes
- Recarrega página após importar

#### Limpar Dados
- Apaga TUDO do localStorage
- Confirmação com alerta duplo
- Irreversível
- Recarrega página após limpar

### 4. Sobre
- Nome do aplicativo
- Versão atual (1.0.0)
- Disclaimer sobre não afiliação oficial

## Componentes Utilizados
- `Header` - Título da página
- `Button` - Ações de dados
- `Toast` - Feedback de operações

## Serviços
- `loadSettings()` - Carrega configurações
- `saveSettings()` - Salva configurações
- `exportAllData()` - Gera objeto de backup
- `importData()` - Processa arquivo importado

## Estrutura do Backup
```json
{
  "characters": [...],
  "rollHistory": [...],
  "settings": {
    "theme": "dark",
    "soundEnabled": true,
    "vibrationEnabled": true
  },
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Estilização
- `Settings.css` - Lista de opções
- Toggle switches customizados
- Seções com títulos uppercase

## Toggle Switch
```css
/* Implementação CSS puro */
- Input hidden
- Slider com transition
- Pseudo-elemento para knob
- Estado :checked para ativo
```

## Fluxo de Export
```
1. Coleta dados do localStorage
2. Serializa para JSON
3. Cria Blob
4. Gera URL temporária
5. Simula clique em <a download>
6. Revoga URL
```

## Fluxo de Import
```
1. Input file seleciona arquivo
2. FileReader lê conteúdo
3. JSON.parse valida estrutura
4. importData() distribui dados
5. Reload para aplicar
```

## Considerações
- Exportar regularmente (não há cloud sync)
- Import substitui, não mescla dados
- Tema pode ser expandido no futuro
- Versão para compatibilidade de backup
