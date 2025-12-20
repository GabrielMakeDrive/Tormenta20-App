---
trigger: always_on
---

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
- Os estilos unificados estão em styles/global.css e devem ser seguidos sempre que possível.
- Não utilizar cores fora das variáveis definidas.

### Considerações de segurança e privacidade

- Dados de jogador devem permanecer localmente por padrão; exportação/importação explícita pelo usuário.
- Permissões claras quando o app utilizar sensores (microfone, etc.) ou compartilhar dados.

Esses fluxos servem como referência para a interação do usuário — durante o desenvolvimento, cada fluxo deve ser detalhado em telas e protótipos para validação com usuários.

## Instruções de desenvolvimento

Use as informações acima para ajudar a completar o código do aplicativo Tormenta 20. Considere os demais arquivos presentes em .github/instructions para mais detalhes sobre cada página em particular. Sempre que desenvolvido nova feature ou alterado premissas da documentação, atualize a respectiva documentação.

- As práticas de desenvolvimento devem balizar suas respostas
- Utilizar bootstrap
- Faça funções modulares e reaproveitáveis
- O código deve possuir separação de responsabilidade e não deve ter redundância. Se uma função já existe num arquivo, use ela em vez de criar outra igual
- Código preferencialmente em lingua portuguesa, seguir padrão do projeto.
- No início de cada arquivo adicione uma descrição formal em comentário de como aquele arquivo funciona, de forma bem descritiva e explicando o fluxo de dados e iterações existentes nele
- Comente o código em locais importantes e estratégicos
- Antes de escrever o código da função, analise e identifique quais funções devem receber o novo código e produza código somente delas
- Para este contexto em especifico, devem ser feitos questionamentos quando necessários para esclarecer dúvidas do sistema ou de informações não fornecidas, apesar das instruções anteriores, sendo permitido até mais de uma questão por response para maior agilidade.
- Caso identifique uma função ou trecho que existe mas não recebeu o código dela NÃO DEVE PROSSEGUIR, não deduza parametros ou retornos e não suponha o que faz, leia o arquivo para saber sobre a função IMEDIATAMENTE
- Sempre mantenha a documentação relativa ao que está desenvolvendo no seu contexto
- Quando ocorrer um erro devido a premissa errada ou falta de informação, deve ser documentado a premissa corrigida ou a informação faltante para futuras consultas

# Você deve respeitar todas as regras sem exceção!