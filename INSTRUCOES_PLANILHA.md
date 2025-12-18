# Instruções para Configurar a Planilha

## Estrutura da Planilha

A planilha do Google Sheets deve ter **duas abas**:

### 1. Aba "Leads"
Esta aba contém os leads indicados. Deve ter as seguintes colunas:

| Coluna | Nome | Descrição |
|--------|------|-----------|
| A | Data/Hora | Data e hora da indicação |
| B | Nome | Nome do lead indicado |
| C | Telefone | Telefone do lead |
| D | Código de Indicação | Código do promotor que fez a indicação |
| E | Origem | Origem da indicação (ex: "landing-cartao-de-todos") |

**Exemplo:**
```
Data/Hora          | Nome          | Telefone      | Código de Indicação | Origem
2025-11-13 10:00   | João Silva    | 21999999999  | 1                   | landing-cartao-de-todos
2025-11-13 11:00   | Maria Santos  | 21888888888  | 2                   | landing-cartao-de-todos
```

### 2. Aba "Promotor"
Esta aba contém o mapeamento de códigos para nomes dos promotores. Deve ter as seguintes colunas:

| Coluna | Nome | Descrição |
|--------|------|-----------|
| A | ID | Código único do promotor (pode ser número ou texto) |
| B | Nome | Nome completo do promotor |

**Exemplo:**
```
ID | Nome
1  | Rafael Rangel
2  | Douglas Martins
3  | João Santos
123| Ana Costa
```

**Nota:** O sistema busca automaticamente pela coluna "ID" (que contém o código do promotor). Se não encontrar "ID", tentará buscar por "Código" ou "Codigo".

## Importante

1. **Nomes das abas**: As abas devem se chamar exatamente:
   - `Leads` (para os leads)
   - `Promotor` (para os promotores)

2. **Nomes das colunas**: 
   - Na aba "Leads": Os nomes das colunas devem corresponder aos nomes acima (aceita "Data/Hora" ou "Data e Hora")
   - Na aba "Promotor": A coluna de código deve se chamar "ID" (ou "Código"/"Codigo" como alternativa), e a coluna de nome deve se chamar "Nome"

3. **Códigos**: Os códigos na coluna "ID" da aba "Promotor" devem corresponder aos códigos usados na coluna "Código de Indicação" da aba "Leads". O sistema faz match tanto com números quanto com strings.

4. **Primeira linha**: A primeira linha de cada aba deve conter os cabeçalhos (nomes das colunas).

## Como Funciona

1. Quando um lead é indicado, ele é salvo na aba "Leads" com o código do promotor.
2. O dashboard busca os dados da aba "Leads" para contar as indicações.
3. O dashboard busca os nomes dos promotores na aba "Promotor" usando o código como chave.
4. Os nomes são exibidos no ranking ao invés dos códigos.

## Atualização do Google Apps Script

Certifique-se de que o código do Google Apps Script foi atualizado com a função `getDashboardData()` que busca dados de ambas as abas. O código atualizado está no arquivo `google-apps-script-dashboard.js`.

