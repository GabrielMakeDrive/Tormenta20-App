---
applyTo: "**/services/**"
---
# Services - Instruções

## Propósito
Camada de serviços para persistência de dados e operações de I/O.

## Localização
`src/services/`

---

## StorageService.js
Serviço de armazenamento local usando localStorage API.

### Chaves de Armazenamento
```javascript
const STORAGE_KEYS = {
  CHARACTERS: 'tormenta20_characters',
  ROLL_HISTORY: 'tormenta20_roll_history',
  SETTINGS: 'tormenta20_settings'
};
```

---

### Funções Genéricas

#### saveData(key, data)
Salva dados serializados no localStorage.
```javascript
// Retorna: boolean (sucesso/falha)
saveData('minha_chave', { foo: 'bar' });
```

#### loadData(key, defaultValue)
Carrega e desserializa dados.
```javascript
// Retorna: dados ou defaultValue se não existir
const data = loadData('minha_chave', []);
```

#### removeData(key)
Remove uma chave do storage.
```javascript
// Retorna: boolean
removeData('minha_chave');
```

---

### Funções de Personagens

#### saveCharacters(characters)
Salva array completo de personagens.

#### loadCharacters()
Carrega todos os personagens.
```javascript
// Retorna: array (vazio se não houver dados)
const chars = loadCharacters();
```

#### saveCharacter(character)
Adiciona ou atualiza um personagem.
- Se ID existe: atualiza
- Se não existe: adiciona
- Atualiza `updatedAt` automaticamente

#### deleteCharacter(characterId)
Remove personagem pelo ID.

#### getCharacterById(characterId)
Busca um personagem específico.
```javascript
// Retorna: objeto ou null
const char = getCharacterById('uuid-123');
```

---

### Funções de Histórico de Rolagens

**Limite**: Máximo 50 rolagens armazenadas.

#### saveRollHistory(history)
Salva histórico (aplica trim automático).

#### loadRollHistory()
Carrega histórico de rolagens.

#### addRollToHistory(roll)
Adiciona nova rolagem ao histórico.

#### clearRollHistory()
Limpa todo o histórico.

---

### Funções de Configurações

#### DEFAULT_SETTINGS
```javascript
{
  theme: 'dark',
  soundEnabled: true,
  vibrationEnabled: true
}
```

#### saveSettings(settings)
Salva configurações do usuário.

#### loadSettings()
Carrega configurações (usa defaults se não existir).

---

### Funções de Backup

#### exportAllData()
Gera objeto completo para backup.
```javascript
{
  characters: [...],
  rollHistory: [...],
  settings: {...},
  exportedAt: 'ISO timestamp',
  version: '[version from package.json]'
}
```

#### importData(data)
Importa dados de um backup.
```javascript
// Retorna: { success: boolean, error?: string }
const result = importData(backupData);
if (result.success) {
  // Dados importados
}
```

### Eventos
- `SETTINGS_UPDATE_EVENT`: emitido após qualquer `saveSettings()` bem-sucedido para permitir que componentes reajam em tempo real.
- Sempre despache este evento no browser principal (usar `CustomEvent`).

---

## Persistência (Storage API)

- O serviço deve expor helpers para verificar e solicitar armazenamento persistente usando `navigator.storage`.
- `isPersistentStorageEnabled()` retorna uma *Promise<boolean>* que indica se o modo persistente já está ativo (ou *false* em navegadores sem suporte).
- `ensurePersistentStorage()` tenta habilitar o modo persistente (quando suportado) e nunca deve lançar erros para a UI, retornando `{ supported, persisted }`.
- A aplicação precisa chamar `ensurePersistentStorage()` durante a inicialização para minimizar o risco de eviction automático dos dados pelo navegador.

---

## Considerações Técnicas

### Limite de Armazenamento
- localStorage: ~5-10MB por domínio
- Suficiente para centenas de personagens

### Serialização
- Usa `JSON.stringify` / `JSON.parse`
- Datas são strings ISO 8601

### Tratamento de Erros
- Try/catch em todas as operações
- Console.error para debugging
- Retorno de fallback/default em caso de erro

### Sincronização
- Não há sync com cloud
- Dados são locais ao dispositivo
- Backup manual via export/import

### Performance
- Operações síncronas (localStorage é síncrono)
- Evitar salvar em loops frequentes
- Preferir batch updates

---

## Exemplo de Uso

```javascript
import { 
  loadCharacters, 
  saveCharacter, 
  deleteCharacter 
} from '../services';

// Carregar todos
const characters = loadCharacters();

// Salvar um
saveCharacter(newCharacter);

// Remover
deleteCharacter('uuid-123');

// Exportar tudo
const backup = exportAllData();
downloadAsJson(backup);

// Importar
const result = importData(uploadedData);
```
