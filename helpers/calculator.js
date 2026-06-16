// Converter 'HH:MM:SS' ou 'HH:MM' para minutos desde meia-noite
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.toString().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

// Converter minutos para string 'HH:MM' com suporte a minutos negativos para saldos
function minutesToTime(mins) {
  if (mins === null || isNaN(mins)) return '00:00';
  const sign = mins < 0 ? '-' : '';
  const absMins = Math.abs(mins);
  const hours = Math.floor(absMins / 60);
  const minutes = absMins % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Processar batidas de um único dia e retornar horas trabalhadas, extras e faltas em minutos
function calculateDay({
  isWorkingDay,
  entrada1,
  saida1,
  entrada2,
  saida2,
  folga_periodo1,
  folga_periodo2,
  baseConfig,
  isSaturday = false
}) {
  const {
    entrada1_base,
    saida1_base,
    entrada2_base,
    saida2_base,
    tolerancia_minutos
  } = baseConfig;

  const e1_base = timeToMinutes(entrada1_base);
  const s1_base = timeToMinutes(saida1_base);
  
  // Sábado tem apenas o 1º período como base de expediente (4 horas)
  const e2_base = isSaturday ? null : timeToMinutes(entrada2_base);
  const s2_base = isSaturday ? null : timeToMinutes(saida2_base);

  const duration1_base = s1_base - e1_base;
  const duration2_base = isSaturday ? 0 : (s2_base - e2_base);

  // Se não for dia útil (fim de semana/domingo ou feriado configurado)
  if (!isWorkingDay) {
    let workedMins = 0;
    let overtimeMins = 0;

    const ent1 = timeToMinutes(entrada1);
    const sai1 = timeToMinutes(saida1);
    if (ent1 !== null && sai1 !== null && sai1 > ent1) {
      workedMins += (sai1 - ent1);
    }

    const ent2 = timeToMinutes(entrada2);
    const sai2 = timeToMinutes(saida2);
    if (ent2 !== null && sai2 !== null && sai2 > ent2) {
      workedMins += (sai2 - ent2);
    }

    // Em dia não útil, todo tempo trabalhado vira hora extra
    overtimeMins = workedMins;

    return {
      workedMins,
      overtimeMins,
      missingMins: 0,
      details: {
        e1: entrada1 ? entrada1.substring(0, 5) : null,
        s1: saida1 ? saida1.substring(0, 5) : null,
        e2: entrada2 ? entrada2.substring(0, 5) : null,
        s2: saida2 ? saida2.substring(0, 5) : null,
        folga1: !!folga_periodo1,
        folga2: !!folga_periodo2
      }
    };
  }

  // Se for dia útil
  let worked1 = 0;
  let overtime1 = 0;
  let missing1 = 0;

  let worked2 = 0;
  let overtime2 = 0;
  let missing2 = 0;

  // Processar 1º Período
  if (folga_periodo1) {
    worked1 = duration1_base;
    overtime1 = 0;
    missing1 = 0;
  } else {
    const ent1 = timeToMinutes(entrada1);
    const sai1 = timeToMinutes(saida1);

    if (ent1 === null || sai1 === null) {
      // Falta completa no período
      worked1 = 0;
      overtime1 = 0;
      missing1 = duration1_base;
    } else {
      // Aplicar tolerância para entrada 1
      const diff_e1 = ent1 - e1_base;
      const eff_e1 = Math.abs(diff_e1) <= tolerancia_minutos ? e1_base : ent1;

      // Aplicar tolerância para saída 1
      const diff_s1 = sai1 - s1_base;
      const eff_s1 = Math.abs(diff_s1) <= tolerancia_minutos ? s1_base : sai1;

      // Calcular desvios
      const late_e1 = eff_e1 > e1_base ? eff_e1 - e1_base : 0;
      const early_e1 = eff_e1 < e1_base ? e1_base - eff_e1 : 0;
      const late_s1 = eff_s1 > s1_base ? eff_s1 - s1_base : 0;
      const early_s1 = eff_s1 < s1_base ? s1_base - eff_s1 : 0;

      overtime1 = early_e1 + late_s1;
      missing1 = late_e1 + early_s1;
      worked1 = duration1_base + overtime1 - missing1;
    }
  }

  // Processar 2º Período
  if (isSaturday) {
    // Sábado não tem expediente base no 2º período
    const ent2 = timeToMinutes(entrada2);
    const sai2 = timeToMinutes(saida2);

    if (ent2 !== null && sai2 !== null && sai2 > ent2) {
      worked2 = sai2 - ent2;
      overtime2 = worked2; // Qualquer batida no 2º período vira hora extra
    } else {
      worked2 = 0;
      overtime2 = 0;
    }
    missing2 = 0; // Sem expediente base = sem faltas no período 2
  } else if (folga_periodo2) {
    worked2 = duration2_base;
    overtime2 = 0;
    missing2 = 0;
  } else {
    const ent2 = timeToMinutes(entrada2);
    const sai2 = timeToMinutes(saida2);

    if (ent2 === null || sai2 === null) {
      // Falta completa no período
      worked2 = 0;
      overtime2 = 0;
      missing2 = duration2_base;
    } else {
      // Aplicar tolerância para entrada 2
      const diff_e2 = ent2 - e2_base;
      const eff_e2 = Math.abs(diff_e2) <= tolerancia_minutos ? e2_base : ent2;

      // Aplicar tolerância para saída 2
      const diff_s2 = sai2 - s2_base;
      const eff_s2 = Math.abs(diff_s2) <= tolerancia_minutos ? s2_base : sai2;

      // Calcular desvios
      const late_e2 = eff_e2 > e2_base ? eff_e2 - e2_base : 0;
      const early_e2 = eff_e2 < e2_base ? e2_base - eff_e2 : 0;
      const late_s2 = eff_s2 > s2_base ? eff_s2 - s2_base : 0;
      const early_s2 = eff_s2 < s2_base ? s2_base - eff_s2 : 0;

      overtime2 = early_e2 + late_s2;
      missing2 = late_e2 + early_s2;
      worked2 = duration2_base + overtime2 - missing2;
    }
  }

  return {
    workedMins: worked1 + worked2,
    overtimeMins: overtime1 + overtime2,
    missingMins: missing1 + missing2,
    details: {
      e1: entrada1 ? entrada1.substring(0, 5) : null,
      s1: saida1 ? saida1.substring(0, 5) : null,
      e2: entrada2 ? entrada2.substring(0, 5) : null,
      s2: saida2 ? saida2.substring(0, 5) : null,
      folga1: !!folga_periodo1,
      folga2: !!folga_periodo2
    }
  };
}

// Calcular as métricas acumuladas do relatório
function calculateSummary({
  daysCalculated, // Lista de objetos retornados por calculateDay para cada dia do mês
  salario,
  cargaMensalHoras,
  valorPago = 0
}) {
  let totalWorkedMins = 0;
  let totalOvertimeMins = 0;
  let totalMissingMins = 0;
  let totalWorkingDays = 0;
  let totalNonWorkingDays = 0;

  daysCalculated.forEach(day => {
    totalWorkedMins += day.workedMins;
    totalOvertimeMins += day.overtimeMins;
    totalMissingMins += day.missingMins;

    if (day.isWorkingDay) {
      totalWorkingDays++;
    } else {
      totalNonWorkingDays++;
    }
  });

  const totalBalanceMins = totalOvertimeMins - totalMissingMins;

  // Converter minutos em horas decimais
  const totalWorkedHours = totalWorkedMins / 60;
  const totalOvertimeHours = totalOvertimeMins / 60;
  const totalMissingHours = totalMissingMins / 60;
  const totalBalanceHours = totalBalanceMins / 60;

  // Horas restantes (carga mensal - horas trabalhadas)
  const remainingHours = Math.max(0, cargaMensalHoras - totalWorkedHours);

  // Cálculos financeiros
  const salarioBase = parseFloat(salario) || 0;
  const valorHora = cargaMensalHoras > 0 ? salarioBase / cargaMensalHoras : 0;
  const valorHoraExtra = valorHora * 1.5; // Valor da hora + 50%

  // Horas extra em R$: (Saldo Total em horas decimais * Valor da Hora Extra) se o saldo for positivo.
  // Se saldo total for negativo, não gera pagamento de hora extra (ou pode descontar, mas por padrão é 0 no cálculo de adicionais positivos).
  // Nota: o usuário pediu explicitamente: (SALDO TOTAL * 24 * VALOR DA HORA EXTRA). A multiplicação por 24 ocorre se o saldo estivesse
  // armazenado em formato datetime fracionado (1 dia = 1.0). Como aqui trabalhamos com horas decimais diretas, fazemos apenas (Saldo * ValorHoraExtra).
  const saldoPositivoHoras = totalBalanceHours > 0 ? totalBalanceHours : 0;
  const horasExtraRS = saldoPositivoHoras * valorHoraExtra;

  // DSR: ((horas extra em R$ / dias uteis) * dias nao uteis)
  const dsr = totalWorkingDays > 0 ? (horasExtraRS / totalWorkingDays) * totalNonWorkingDays : 0;

  const totalDevido = horasExtraRS + dsr;
  const diferenca = totalDevido - valorPago;

  return {
    totalOvertime: minutesToTime(totalOvertimeMins),
    totalMissing: minutesToTime(totalMissingMins),
    totalBalance: minutesToTime(totalBalanceMins),
    totalWorked: minutesToTime(totalWorkedMins),
    totalBalanceMins,
    totalOvertimeHours,
    totalMissingHours,
    totalBalanceHours,
    totalWorkedHours,
    remainingHours: minutesToTime(Math.round(remainingHours * 60)),
    totalDays: daysCalculated.length,
    workingDays: totalWorkingDays,
    nonWorkingDays: totalNonWorkingDays,
    salarioBase,
    valorHora,
    valorHoraExtra,
    horasExtraRS,
    dsr,
    totalDevido,
    valorPago,
    diferenca
  };
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  calculateDay,
  calculateSummary
};
