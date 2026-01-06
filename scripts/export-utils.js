// Funções utilitárias para exportação de dados
// Compatível com todas as páginas do dashboard

/**
 * Exporta dados para CSV
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} headers - Array com os cabeçalhos das colunas
 * @param {Function} rowMapper - Função que mapeia cada objeto para um array de valores
 */
function exportToCSV(data, filename, headers, rowMapper) {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar!');
    return;
  }

  // Cria cabeçalho
  let csvContent = headers.join(',') + '\n';

  // Adiciona dados
  data.forEach(item => {
    const row = rowMapper(item);
    // Escapa valores que contêm vírgulas ou aspas
    const escapedRow = row.map(value => {
      const str = String(value || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvContent += escapedRow.join(',') + '\n';
  });

  // Cria blob e faz download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta dados para Excel (.xlsx) usando SheetJS
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} headers - Array com os cabeçalhos das colunas
 * @param {Function} rowMapper - Função que mapeia cada objeto para um array de valores
 */
function exportToExcel(data, filename, headers, rowMapper) {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar!');
    return;
  }

  // Verifica se SheetJS está disponível
  if (typeof XLSX === 'undefined') {
    // Carrega SheetJS dinamicamente
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    script.onload = () => {
      performExcelExport(data, filename, headers, rowMapper);
    };
    document.head.appendChild(script);
  } else {
    performExcelExport(data, filename, headers, rowMapper);
  }
}

function performExcelExport(data, filename, headers, rowMapper) {
  // Cria worksheet
  const worksheetData = [headers];
  data.forEach(item => {
    worksheetData.push(rowMapper(item));
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Ajusta largura das colunas
  const colWidths = headers.map((_, colIndex) => {
    let maxLength = headers[colIndex].length;
    worksheetData.forEach(row => {
      const cellValue = String(row[colIndex] || '');
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  // Cria workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  // Faz download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Exporta dados para TXT (formato tabulado)
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} headers - Array com os cabeçalhos das colunas
 * @param {Function} rowMapper - Função que mapeia cada objeto para um array de valores
 */
function exportToTXT(data, filename, headers, rowMapper) {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar!');
    return;
  }

  // Cria conteúdo
  let txtContent = headers.join('\t') + '\n';

  // Adiciona dados
  data.forEach(item => {
    const row = rowMapper(item);
    txtContent += row.map(value => String(value || '')).join('\t') + '\n';
  });

  // Cria blob e faz download
  const blob = new Blob(['\ufeff' + txtContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Exporta funções para uso global
if (typeof window !== 'undefined') {
  window.exportToCSV = exportToCSV;
  window.exportToExcel = exportToExcel;
  window.exportToTXT = exportToTXT;
}
