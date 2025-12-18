# Como Adicionar Nomes dos Promotores

## Instruções

Para que o dashboard mostre o nome do promotor ao invés do código, você precisa mapear cada código para um nome.

### Passo 1: Abrir o arquivo
Abra o arquivo `scripts/dashboard.js`

### Passo 2: Localizar o objeto PROMOTORES
Procure pela seção que começa com:
```javascript
const PROMOTORES = {
  '1': 'João Silva',
  '2': 'Maria Santos',
  // ...
};
```

### Passo 3: Adicionar seus promotores
Adicione cada código e seu respectivo nome no formato:
```javascript
'CODIGO': 'Nome do Promotor',
```

**Exemplo:**
```javascript
const PROMOTORES = {
  '1': 'João Silva',
  '2': 'Maria Santos',
  '123': 'Ana Costa',
  '456': 'Carlos Pereira',
  '789': 'Fernanda Lima',
  // Adicione quantos precisar
};
```

### Passo 4: Salvar e testar
- Salve o arquivo
- Atualize o dashboard no navegador
- Os nomes aparecerão automaticamente

## Observações

- Se um código não estiver mapeado, aparecerá como "Código X" na tabela
- Códigos vazios ou "Sem código" aparecerão como "Sem código"
- O código original ainda aparece abaixo do nome para referência
- Você pode adicionar quantos promotores precisar

## Exemplo Completo

```javascript
const PROMOTORES = {
  '1': 'João Silva',
  '2': 'Maria Santos',
  '3': 'Pedro Oliveira',
  '123': 'Ana Costa',
  '123456556': 'Carlos Pereira',
  'ASFASF': 'Fernanda Lima',
  'CÓDIGOINDICAÇAO123': 'Roberto Alves',
  '999': 'Juliana Ferreira',
  'ABC123': 'Ricardo Souza',
};
```

