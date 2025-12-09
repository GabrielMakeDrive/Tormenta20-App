# App Tormenta 20

## Objetivo

Desenvolver fichas digitais para o sistema Tormenta 20, facilitando o gerenciamento de personagens e campanhas para jogadores e mestres.
Permite a criação, armazenamento e edição de fichas de personagens.
Permite rodar testes de dados e gerenciamento de inventário.
Interface intuitiva e responsiva para facilitar o uso durante as sessões de jogo.
Interface de personagem simplificada porém permite acessar detalhes avançados quando necessário.

## Estrutura do Projeto

App React CRA com JavaScript. Será utilizado como PWA (Progressive Web App) para facilitar o acesso em dispositivos móveis.
Deve ser tratado como um aplicativo mobile, com foco em usabilidade e performance.
Armazenamento local em armazenamento persistente através de Storage API.
Desenvolvido exclusivamente para Android, não deve ser previsto nenhum suporte para iOS.

## Usabilidade

O aplicativo deve ser simples e direto, com fluxos de uso claros para jogadores e mestres. Abaixo estão os principais fluxos de usabilidade que guiam o desenvolvimento da interface e das funcionalidades.

### Fluxos principais

- **Criar nova ficha (Jogador)**
	1. Abrir o app.
	2. Tocar em "Criar Ficha".
	3. Escolher raça, classe, nível inicial.
	4. Preencher atributos principais (força, destreza, constituição, inteligência, sabedoria, carisma).
	5. Salvar ficha localmente com nome e ícone.
	6. Visualizar resumo da ficha com opção de editar.

- **Editar ficha existente (Jogador)**
	1. Abrir a lista de fichas.
	2. Selecionar ficha desejada.
	3. Tocar em "Editar" para alterar atributos, perícias, talentos e equipamentos.
	4. Validar mudanças (ex.: limites de atributos, pré-requisitos de talentos).
	5. Salvar alterações e ver histórico de versão local quando aplicável.

- **Gerenciar inventário (Jogador)**
	1. Abrir ficha e navegar até aba "Inventário".
	2. Adicionar/editar/remover itens com quantidade, comentários.
	3. Aplicar filtros e ordenar por tipo, raridade.

- **Rolar testes/dados (Jogador/Mestre)**
	1. Abrir painel de rolagem de dados na ficha.
	2. Selecionar tipo de rolagem (d4, d8, d20, d100, vantagem/desvantagem, modificadores, etc).
	3. Selecionar tipo de rolagem (exemplo: Teste de furtividade).
	4. Visualizar resultado formatado com interpretação (sucesso, falha crítica, etc.) e histórico de rolagens.

### Requisitos de UX

- Interface responsiva e otimizada para toque simples (mobile-first).
- Ações comuns disponíveis com no máximo 2 taps (abrir, rolar, editar, salvar).
- Feedback imediato e visível para salvar/erro (toasts, banners ou modais não intrusivos).
- Operações offline e sincronização local confiável — PWA com armazenamento persistente.
- Acessibilidade básica: textos legíveis, foco em contraste, e suporte a navegação por teclado quando aplicável.

### Considerações de segurança e privacidade

- Dados de jogador devem permanecer localmente por padrão; exportação/importação explícita pelo usuário.
- Permissões claras quando o app utilizar sensores (microfone, etc.) ou compartilhar dados.

Esses fluxos servem como referência para a interação do usuário — durante o desenvolvimento, cada fluxo deve ser detalhado em telas e protótipos para validação com usuários.