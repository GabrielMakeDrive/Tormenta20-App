# Sistema de Atributos em Tormenta 20

## Premissa Fundamental

**Em Tormenta 20, NÃO existe o conceito de "modificador" de atributo como em D&D 5e.**

O valor do atributo é usado **DIRETAMENTE** em todos os testes e cálculos.

## Como Funciona

### Valores de Atributos
- Os atributos são tipicamente valores entre **-5 e +5**
- O valor padrão (neutro) é **0**
- Exemplo: Força 3, Destreza -1, Constituição 2

### Uso em Testes
Quando você rola um dado para um teste de atributo:
- **d20 + Valor do Atributo**

**Exemplo:**
- Força = 3
- Teste de Força = d20 + 3
- Se tirar 15 no d20, o resultado final é 18

### Bônus Raciais
Os bônus/penalidades raciais são somados diretamente ao valor base:
```javascript
// Exemplo: Anão (+2 Constituição, -1 Destreza)
Constituição base: 1
Bônus racial: +2
Constituição total: 3

Destreza base: 2
Penalidade racial: -1
Destreza total: 1
```

### Cálculo de Perícias
Fórmula: **Metade do Nível + Valor do Atributo + Bônus de Treinamento**

**Exemplo:**
- Nível 5, Força 3, Atleta treinado
- Metade do nível: 2 (5/2 arredondado para baixo)
- Valor de Força: 3
- Bônus de treinamento (nível 5): +2
- **Total: 2 + 3 + 2 = +7**

### Bônus de Treinamento por Nível
- Níveis 1-6: +2
- Níveis 7-14: +4
- Níveis 15-20: +6

## Diferenças com D&D 5e

| Aspecto | D&D 5e | Tormenta 20 |
|---------|--------|-------------|
| Valor de atributo | 8-20 | -5 a +5 |
| Modificador | (Valor - 10) / 2 | Não existe |
| Teste de Força 16 | d20 + 3 | d20 + 3 diretamente |
| Armazenamento | Valor completo (16) | Valor direto (3) |

## Implementação no Código

### Funções Principais

**Character.js:**
```javascript
// Obtém o valor total do atributo (base + raça)
getCharacterTotalAttributeValue(character, attrKey)
// Exemplo: retorna 3 para Força base 1 + bônus racial 2

// NÃO usar: getAttributeModifier() - OBSOLETO
```

**DiceRoller.jsx:**
```javascript
// Valor do atributo é usado diretamente
const attrValue = getCharacterTotalAttributeValue(character, 'forca');
setModifier(attrValue); // Adiciona direto ao teste
```

### Cálculo de PV
Os Pontos de Vida também usam o valor de Constituição diretamente:
```javascript
// Nível 1
PV = hp.initial + Constituição

// Níveis subsequentes
PV = hp.initial + Constituição + (nível - 1) * (hp.perLevel + Constituição)
```

## Arquivos Afetados pela Correção

1. **src/models/Character.js**
   - Removida função `resolveAttributeModifier()`
   - Removida função `getConstitutionModifierValue()`
   - Atualizada documentação
   - Corrigido `computeMaxHp()` para usar valor direto

2. **src/pages/DiceRoller/DiceRoller.jsx**
   - Removido import `getAttributeModifier`
   - Atualizado `getAttributeDisplay()` - não retorna mais "modifier"
   - Atualizado `getSkillBonus()` - usa valor direto do atributo
   - Atualizado `setupAttributeRoll()` - usa valor direto
   - Removido display de modificador na UI

## Validação

Para verificar se o sistema está correto:

1. **Teste de Atributo:**
   - Personagem com Força 3
   - Ao clicar em "FOR", deve configurar modificador +3
   - Ao rolar d20, soma-se d20 + 3

2. **Teste de Perícia:**
   - Nível 5, Força 3, Atletismo treinado
   - Bônus deve ser: 2 (metade nível) + 3 (força) + 2 (treino) = +7

3. **PV:**
   - Guerreiro nível 1, Constituição 2
   - PV = 20 (base) + 2 (Constituição) = 22

## Migração de Dados

Se houver fichas antigas com valores no formato D&D (8-20):
1. **NÃO** tentar converter automaticamente
2. O usuário deve editar manualmente para os novos valores (-5 a +5)
3. Os valores entre -5 e +5 já são interpretados corretamente

---

**Data da Correção:** 10 de Dezembro de 2025  
**Versão:** 1.0.0
