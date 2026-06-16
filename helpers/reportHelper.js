const db = require('./db');
const { calculateDay, calculateSummary } = require('./calculator');
const moment = require('moment');

async function getEmployeeMonthlyData(employeeId, yearMonth) {
  // 1. Obter dados do funcionário
  const [employees] = await db.query('SELECT * FROM funcionarios WHERE id = ?', [employeeId]);
  if (employees.length === 0) {
    throw new Error('Funcionário não encontrado');
  }
  const employee = employees[0];

  // 2. Obter configuração base de jornada
  const [configs] = await db.query('SELECT * FROM configuracao LIMIT 1');
  if (configs.length === 0) {
    throw new Error('Configuração de jornada não encontrada. Execute a inicialização do banco.');
  }
  const baseConfig = configs[0];

  // 3. Gerar lista de todos os dias do mês selecionado (formato YYYY-MM-DD)
  const startOfMonth = moment(yearMonth, 'YYYY-MM').startOf('month');
  const endOfMonth = moment(yearMonth, 'YYYY-MM').endOf('month');
  const daysInMonth = [];
  let currentDay = moment(startOfMonth);
  while (currentDay.isSameOrBefore(endOfMonth)) {
    daysInMonth.push(currentDay.format('YYYY-MM-DD'));
    currentDay.add(1, 'day');
  }

  // 4. Obter dias úteis personalizados do banco de dados para esse intervalo
  const [customDays] = await db.query(
    'SELECT DATE_FORMAT(data, "%Y-%m-%d") as date_str, status, descricao FROM dias_uteis_config WHERE data BETWEEN ? AND ?',
    [startOfMonth.format('YYYY-MM-DD'), endOfMonth.format('YYYY-MM-DD')]
  );
  
  const customDaysMap = {};
  customDays.forEach(cd => {
    customDaysMap[cd.date_str] = cd.status;
  });

  // 5. Obter registros de jornadas do funcionário para esse mês
  const [jornadas] = await db.query(
    'SELECT *, DATE_FORMAT(data, "%Y-%m-%d") as date_str FROM jornadas WHERE funcionario_id = ? AND data BETWEEN ? AND ?',
    [employeeId, startOfMonth.format('YYYY-MM-DD'), endOfMonth.format('YYYY-MM-DD')]
  );

  const jornadasMap = {};
  jornadas.forEach(j => {
    jornadasMap[j.date_str] = j;
  });

  // 6. Obter valor pago no mês
  const [payments] = await db.query(
    'SELECT * FROM valores_pagos WHERE funcionario_id = ? AND ano_mes = ?',
    [employeeId, yearMonth]
  );
  const valorPago = payments.length > 0 ? parseFloat(payments[0].valor_pago) : 0.00;

  // Nome dos dias da semana em português
  const diasSemanaPt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // 7. Calcular métricas dia a dia
  const daysCalculated = [];
  for (const dateStr of daysInMonth) {
    const mDate = moment(dateStr);
    const dayOfWeek = mDate.day(); // 0 = Domingo, 6 = Sábado
    
    // Determinar se é dia útil
    let isWorkingDay = true;
    if (customDaysMap[dateStr]) {
      isWorkingDay = customDaysMap[dateStr] === 'util';
    } else {
      // Padrão: Domingo (0) é DSR / não útil. Sábado a Segunda são úteis.
      isWorkingDay = dayOfWeek !== 0; 
    }

    const jornadaReg = jornadasMap[dateStr] || {};
    
    // Determinar o horário efetivo por prioridade:
    // 1. Horário padrão vinculado ao funcionário (horario_padrao_id)
    // 2. Colunas avulsas do funcionário (legado)
    // 3. Configuração global da empresa
    let horarioPadrao = null;
    if (employee.horario_padrao_id) {
      const [schedRows] = await db.query('SELECT * FROM horarios_padrao WHERE id = ?', [employee.horario_padrao_id]);
      if (schedRows.length > 0) horarioPadrao = schedRows[0];
    }

    const effectiveConfig = {
      ...baseConfig,
      entrada1_base: (horarioPadrao && horarioPadrao.entrada1_base) || employee.entrada1_base || baseConfig.entrada1_base,
      saida1_base:   (horarioPadrao && horarioPadrao.saida1_base)   || employee.saida1_base   || baseConfig.saida1_base,
      entrada2_base: (horarioPadrao && horarioPadrao.entrada2_base) || employee.entrada2_base || baseConfig.entrada2_base,
      saida2_base:   (horarioPadrao && horarioPadrao.saida2_base)   || employee.saida2_base   || baseConfig.saida2_base
    };

    // Executar o motor de cálculo diário
    const dayResult = calculateDay({
      isWorkingDay,
      entrada1: jornadaReg.entrada1 || null,
      saida1: jornadaReg.saida1 || null,
      entrada2: jornadaReg.entrada2 || null,
      saida2: jornadaReg.saida2 || null,
      folga_periodo1: jornadaReg.folga_periodo1 || 0,
      folga_periodo2: jornadaReg.folga_periodo2 || 0,
      baseConfig: effectiveConfig,
      isSaturday: (dayOfWeek === 6)
    });

    daysCalculated.push({
      date: dateStr,
      dayOfMonth: mDate.date(),
      dayOfWeekName: diasSemanaPt[dayOfWeek],
      dayOfWeekNameFull: `${mDate.date()} - ${diasSemanaPt[dayOfWeek]}`,
      isWorkingDay,
      workedMins: dayResult.workedMins,
      overtimeMins: dayResult.overtimeMins,
      missingMins: dayResult.missingMins,
      workedStr: dayResult.workedMins > 0 ? minutesToHoursStr(dayResult.workedMins) : '-',
      overtimeStr: dayResult.overtimeMins > 0 ? minutesToHoursStr(dayResult.overtimeMins) : '-',
      missingStr: dayResult.missingMins > 0 ? minutesToHoursStr(dayResult.missingMins) : '-',
      details: dayResult.details,
      observacao: jornadaReg.observacao || ''
    });
  }

  // 8. Calcular resumo mensal acumulado
  const summary = calculateSummary({
    daysCalculated,
    salario: employee.salario,
    cargaMensalHoras: baseConfig.carga_mensal_horas,
    valorPago
  });

  return {
    employee,
    days: daysCalculated,
    summary,
    config: baseConfig
  };
}

function minutesToHoursStr(totalMins) {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

module.exports = {
  getEmployeeMonthlyData
};
