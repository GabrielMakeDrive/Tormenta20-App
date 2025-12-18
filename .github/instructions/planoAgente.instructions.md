---
applyTo: "**/*.js"
---

# Esta é a orientação para como o agente deve criar planos de ação para implementar funcionalidades na aplicação
1. Toda funcionalidade deve ser precedida de um plano de implementação, que estará no folder .github/plans/nomeDaFuncionalidade.md
2. O plano de implementação deve conter:
    - Descrição da funcionalidade
        - Aqui o agente deve explicar o que a funcionalidade faz, baseado sempre nas regras de negócio da aplicação, estrutura do projeto, instruções gerais fornecidas pelo usuário e outros documentos relevantes.
    - Regras de negócio
        - As regras de negócio devem ser a partir da requisição do cliente e objetivo da funcionalidade
        - Cada regra de negócio deve ser numerada para referência futura
        - Toda regra de negócio deve ter seu atendimento lastreado tecnicamente no plano, referenciando arquivos/métodos que serão criados ou alterados para atender a regra de negócio
    - Requisitos funcionais e não funcionais
        - Aqui o agente deve listar os requisitos que a funcionalidade deve atender, tanto funcionais (o que a funcionalidade deve fazer) quanto não funcionais (como a funcionalidade deve se comportar, como performance, segurança, etc.).
        - Cada requisito deve referenciar o numero de regras de negócio fornecido pelo usuário, se houver.
    - Critérios de aceitação
        - Aqui o agente deve definir os critérios que devem ser atendidos para que a funcionalidade seja considerada completa e aceita. Isso pode incluir casos de uso, cenários de teste, etc.
    - Passos para implementação
        - Aqui o agente deve descrever os passos necessários para implementar a funcionalidade, incluindo detalhes técnicos, como quais arquivos devem ser modificados, quais bibliotecas devem ser utilizadas, etc.
        - Dentre os arquivos que devem ser modificados, o agente deve listar os métodos que serão alterados e/ou criados e as respectivas classes ou hooks que receberão esses métodos novos e modificados.
        - Os passos para implementação devem possuir um TODO numerado com espaço para marcar um X entre [ ] para cada passo, indicando que o passo foi concluído.
3. Durante a elaboração do plano, o agente deve SEMPRE ficar consultando os arquivos necessários, não deve haver pressa.
### ** Não deve ser escrito o plano sem revisar os arquivos existentes e a estrutura do projeto. **
4. Ao solicitar o plano, o usuário vai fornecer um arquivo de regras de negócio ou um pedido, que são as coisas que a funcionalidade precisa fazer e garantir
5. O plano deve abranger todas as regras de negócio fornecidas pelo usuário. Caso alguma regra de negócio entre em conflito com alguma outra coisa, o agente deve colocar o conflito identificado numa seção "CONFLITOS" no final do plano
6. O agente deve sempre consultar os arquivos da estrutura de dados do projeto para respeitar e somente ajustar onde for estritamente necessário
9. Essa regra é a mais importante para o longo prazo do projeto > Todos domínios da aplicação deve possuir um arquivo em .github/instructions/nomeDaFuncionalidade.instructions.md que deve conter todas as regras de negócio do domínio, requisitos funcionais e não funcionais, lastro técnico de atendimento de onde cada coisa foi atendida dentro do código, critérios de aceitação, testes necessários para validar a funcionalidade. O agente deve SEMPRE consultar esse arquivo antes de criar um plano de implementação.