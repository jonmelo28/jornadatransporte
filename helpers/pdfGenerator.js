const PDFDocument = require('pdfkit');
const moment = require('moment');

// Função para desenhar a folha de ponto de um único funcionário no documento PDF
function drawEmployeePage(doc, data) {
  const { employee, days, summary, config } = data;
  
  // Margens e Dimensões
  const startX = 30;
  const startY = 30;
  const printableWidth = 535; // A4 width 595 - 60 (margins)
  
  // Fontes Padrão do PDFKit: Helvetica, Helvetica-Bold
  
  // 1. CABEÇALHO DA EMPRESA E TÍTULO
  doc.rect(startX, startY, printableWidth, 55).stroke('#d1d5db');
  
  doc.fillColor('#1e1b4b').fontSize(14).text(config.empresa_nome, startX + 15, startY + 12, { bold: true });
  doc.fillColor('#4b5563').fontSize(9).text('Controle de Ponto e Jornada de Trabalho', startX + 15, startY + 32);
  
  const periodStr = moment(days[0].date).format('MM/YYYY');
  doc.fillColor('#1e1b4b').fontSize(12).text(`Competência: ${periodStr}`, startX + 380, startY + 20, { align: 'right', width: 140 });

  // 2. DADOS DO FUNCIONÁRIO
  let infoY = startY + 65;
  doc.rect(startX, infoY, printableWidth, 40).stroke('#d1d5db');
  
  doc.fillColor('#1f2937').fontSize(9);
  doc.text(`Funcionário: ${employee.nome}`, startX + 10, infoY + 8);
  doc.text(`Cargo: ${employee.cargo === 'motorista' ? 'Motorista' : 'Ajudante'}`, startX + 10, infoY + 22);
  
  doc.text(`Salário Base: R$ ${parseFloat(employee.salario).toFixed(2)}`, startX + 220, infoY + 8);
  doc.text(`Carga Horária: ${config.carga_mensal_horas}h mensais`, startX + 220, infoY + 22);

  doc.text(`Valor/Hora: R$ ${summary.valorHora.toFixed(2)}`, startX + 380, infoY + 8);
  doc.text(`Valor/Hora Extra (50%): R$ ${summary.valorHoraExtra.toFixed(2)}`, startX + 380, infoY + 22);

  // 3. TABELA DE APURAÇÃO
  let tableY = infoY + 50;
  const colWidths = {
    data: 90,
    e1: 45,
    s1: 45,
    e2: 45,
    s2: 45,
    worked: 50,
    extra: 50,
    missing: 50,
    obs: 115
  };
  
  const colX = {
    data: startX,
    e1: startX + colWidths.data,
    s1: startX + colWidths.data + colWidths.e1,
    e2: startX + colWidths.data + colWidths.e1 + colWidths.s1,
    s2: startX + colWidths.data + colWidths.e1 + colWidths.s1 + colWidths.e2,
    worked: startX + colWidths.data + colWidths.e1 + colWidths.s1 + colWidths.e2 + colWidths.s2,
    extra: startX + colWidths.data + colWidths.e1 + colWidths.s1 + colWidths.e2 + colWidths.s2 + colWidths.worked,
    missing: startX + colWidths.data + colWidths.e1 + colWidths.s1 + colWidths.e2 + colWidths.s2 + colWidths.worked + colWidths.extra,
    obs: startX + colWidths.data + colWidths.e1 + colWidths.s1 + colWidths.e2 + colWidths.s2 + colWidths.worked + colWidths.extra + colWidths.missing
  };

  // Cabeçalho da Tabela
  const tableHeaderHeight = 20;
  doc.rect(startX, tableY, printableWidth, tableHeaderHeight).fill('#1e1b4b');
  
  doc.fillColor('#ffffff').fontSize(7);
  doc.text('Dia / Data', colX.data + 8, tableY + 6);
  doc.text('1ª Ent', colX.e1 + 8, tableY + 6);
  doc.text('1ª Saí', colX.s1 + 8, tableY + 6);
  doc.text('2ª Ent', colX.e2 + 8, tableY + 6);
  doc.text('2ª Saí', colX.s2 + 8, tableY + 6);
  doc.text('Trabalhado', colX.worked + 6, tableY + 6);
  doc.text('Extras', colX.extra + 12, tableY + 6);
  doc.text('Faltas', colX.missing + 12, tableY + 6);
  doc.text('Observação', colX.obs + 10, tableY + 6);

  // Linhas da Tabela
  let currentY = tableY + tableHeaderHeight;
  const rowHeight = 13;

  days.forEach((day, index) => {
    // Fundo zebra
    if (index % 2 === 0) {
      doc.rect(startX, currentY, printableWidth, rowHeight).fill('#f9fafb');
    }
    
    // Cor do texto
    doc.fillColor('#1f2937').fontSize(7);

    // Data por extenso compacta: "01 Sex" ou "01/06/2026 Seg"
    const dateFormatted = `${moment(day.date).format('DD/MM')} - ${day.dayOfWeekName.substring(0, 3)}`;
    doc.text(dateFormatted, colX.data + 8, currentY + 3);

    // Batidas
    if (day.details.folga1 && day.details.folga2) {
      doc.text('FOLGA INTEGRAL', colX.e1 + 8, currentY + 3);
    } else {
      doc.text(day.details.folga1 ? 'FOLGA' : (day.details.e1 || '-'), colX.e1 + 8, currentY + 3);
      doc.text(day.details.folga1 ? 'FOLGA' : (day.details.s1 || '-'), colX.s1 + 8, currentY + 3);
      doc.text(day.details.folga2 ? 'FOLGA' : (day.details.e2 || '-'), colX.e2 + 8, currentY + 3);
      doc.text(day.details.folga2 ? 'FOLGA' : (day.details.s2 || '-'), colX.s2 + 8, currentY + 3);
    }

    doc.text(day.workedStr, colX.worked + 12, currentY + 3);
    doc.text(day.overtimeStr, colX.extra + 12, currentY + 3);
    doc.text(day.missingStr, colX.missing + 12, currentY + 3);
    
    // Observação
    const obsStr = day.observacao ? day.observacao.substring(0, 25) : '';
    doc.text(obsStr, colX.obs + 10, currentY + 3);

    // Linha divisória horizontal sutil
    doc.rect(startX, currentY, printableWidth, rowHeight).stroke('#e5e7eb');
    currentY += rowHeight;
  });

  // Linhas verticais da tabela
  const tableTotalHeight = tableHeaderHeight + (days.length * rowHeight);
  doc.lineCap('butt');
  Object.values(colX).forEach(x => {
    if (x > startX) {
      doc.moveTo(x, tableY).lineTo(x, tableY + tableTotalHeight).stroke('#d1d5db');
    }
  });
  doc.rect(startX, tableY, printableWidth, tableTotalHeight).stroke('#d1d5db');

  // 4. QUADRO RESUMO E FINANCEIRO
  let summaryY = tableY + tableTotalHeight + 10;
  
  // Caixa Resumo de Horas (Esquerda)
  doc.rect(startX, summaryY, 260, 115).stroke('#d1d5db');
  doc.rect(startX, summaryY, 260, 20).fill('#374151');
  doc.fillColor('#ffffff').fontSize(8).text('RESUMO DE HORAS DO MÊS', startX + 10, summaryY + 6);
  
  doc.fillColor('#1f2937').fontSize(7.5);
  let summaryItemY = summaryY + 26;
  doc.text(`Total de Dias no Período: ${summary.totalDays}`, startX + 15, summaryItemY);
  doc.text(`Dias Úteis: ${summary.workingDays} | Dias Não Úteis (DSR): ${summary.nonWorkingDays}`, startX + 15, summaryItemY + 12);
  
  doc.text(`Horas Trabalhadas: ${summary.totalWorked}`, startX + 15, summaryItemY + 28);
  doc.text(`Horas Restantes p/ Carga Mensal: ${summary.remainingHours}`, startX + 15, summaryItemY + 40);
  
  doc.text(`Total Horas Extras (+): ${summary.totalOvertime}`, startX + 15, summaryItemY + 56);
  doc.text(`Total Horas Faltantes (-): ${summary.totalMissing}`, startX + 15, summaryItemY + 68);
  
  // Saldo
  doc.fontSize(9);
  const balancePrefix = summary.totalBalanceMins >= 0 ? '+' : '';
  doc.fillColor(summary.totalBalanceMins >= 0 ? '#047857' : '#b91c1c')
     .text(`Saldo Final: ${summary.totalBalance}`, startX + 15, summaryItemY + 84, { bold: true });

  // Caixa Financeiro (Direita)
  doc.rect(startX + 275, summaryY, 260, 115).stroke('#d1d5db');
  doc.rect(startX + 275, summaryY, 260, 20).fill('#374151');
  doc.fillColor('#ffffff').fontSize(8).text('DEMONSTRATIVO FINANCEIRO ESTIMADO', startX + 285, summaryY + 6);

  doc.fillColor('#1f2937').fontSize(7.5);
  let finItemY = summaryY + 26;
  doc.text(`Salário Base: R$ ${summary.salarioBase.toFixed(2)}`, startX + 290, finItemY);
  doc.text(`Valor da Hora Normal: R$ ${summary.valorHora.toFixed(2)}`, startX + 290, finItemY + 12);
  doc.text(`Valor da Hora Extra (50%): R$ ${summary.valorHoraExtra.toFixed(2)}`, startX + 290, finItemY + 24);
  
  doc.text(`Horas Extras Apuradas: R$ ${summary.horasExtraRS.toFixed(2)}`, startX + 290, finItemY + 42);
  doc.text(`Reflexo DSR s/ Extras: R$ ${summary.dsr.toFixed(2)}`, startX + 290, finItemY + 54);
  doc.fillColor('#1e1b4b').text(`Total Devido (Extras + DSR): R$ ${summary.totalDevido.toFixed(2)}`, startX + 290, finItemY + 68, { bold: true });
  
  doc.fillColor('#4b5563').text(`Valor Pago Adiantado: R$ ${summary.valorPago.toFixed(2)}`, startX + 290, finItemY + 84);
  doc.fillColor(summary.diferenca >= 0 ? '#047857' : '#b91c1c')
     .text(`Diferença a Pagar: R$ ${summary.diferenca.toFixed(2)}`, startX + 290, finItemY + 96, { bold: true });

  // 5. ASSINATURAS
  let sigY = summaryY + 130;
  doc.strokeColor('#9ca3af').lineWidth(0.5);
  
  doc.moveTo(startX + 20, sigY).lineTo(startX + 220, sigY).stroke();
  doc.fillColor('#4b5563').fontSize(7.5).text('Assinatura do Funcionário', startX + 20, sigY + 5, { align: 'center', width: 200 });

  doc.moveTo(startX + 295, sigY).lineTo(startX + 495, sigY).stroke();
  doc.fillColor('#4b5563').fontSize(7.5).text('Representante da Empresa', startX + 295, sigY + 5, { align: 'center', width: 200 });
}

// Exporta arquivo PDF para Express res
function exportIndividualPDF(res, reportData) {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  // Configurar headers para download do PDF
  const filename = `Folha_Ponto_${reportData.employee.nome.replace(/\s+/g, '_')}_${moment(reportData.days[0].date).format('MM_YYYY')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  doc.pipe(res);
  drawEmployeePage(doc, reportData);
  doc.end();
}

// Exporta um PDF com todos os motoristas selecionados
function exportDriversCombinedPDF(res, driversDataList, yearMonth) {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  const filename = `Folhas_Ponto_Motoristas_${moment(yearMonth, 'YYYY-MM').format('MM_YYYY')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  doc.pipe(res);
  
  driversDataList.forEach((data, index) => {
    drawEmployeePage(doc, data);
    
    // Se não for o último, adiciona uma nova página
    if (index < driversDataList.length - 1) {
      doc.addPage();
    }
  });
  
  doc.end();
}

module.exports = {
  exportIndividualPDF,
  exportDriversCombinedPDF
};
