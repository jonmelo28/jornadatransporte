const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { getEmployeeMonthlyData } = require('../helpers/reportHelper');
const moment = require('moment');

// Tela de Financeiro (Valores de Horas Extras, DSR, Valor Pago e Diferença)
router.get('/financeiro', requireAuth, requirePermission('financeiro'), async (req, res) => {
  const selectedMonth = req.query.mes || moment().format('YYYY-MM');

  try {
    // 1. Obter todos os funcionários
    const [employees] = await db.query('SELECT id, nome, cargo, salario FROM funcionarios ORDER BY nome ASC');

    const motoristas = [];
    const ajudantes = [];

    // 2. Para cada funcionário, calcular os valores do fechamento mensal
    for (const emp of employees) {
      try {
        const monthlyData = await getEmployeeMonthlyData(emp.id, selectedMonth);
        
        // Agregar os valores calculados ao objeto
        emp.valorHora = monthlyData.summary.valorHora;
        emp.valorHoraExtra = monthlyData.summary.valorHoraExtra;
        emp.horasExtraRS = monthlyData.summary.horasExtraRS;
        emp.dsr = monthlyData.summary.dsr;
        emp.valorPago = monthlyData.summary.valorPago;
        emp.diferenca = monthlyData.summary.diferenca;
      } catch (err) {
        console.error(`Erro ao processar financeiro para funcionário ${emp.id}:`, err);
        emp.valorHora = 0;
        emp.valorHoraExtra = 0;
        emp.horasExtraRS = 0;
        emp.dsr = 0;
        emp.valorPago = 0;
        emp.diferenca = 0;
      }

      if (emp.cargo === 'motorista') {
        motoristas.push(emp);
      } else {
        ajudantes.push(emp);
      }
    }

    res.render('payments/index', {
      title: 'Controle de Pagamento de Extras',
      motoristas,
      ajudantes,
      employees, // Lista completa para o formulário de cadastro de pagamento
      selectedMonth,
      success: null,
      error: null
    });
  } catch (error) {
    console.error('Erro ao carregar tela financeira:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar dados financeiros.' });
  }
});

// Cadastrar / Editar Valor Pago
router.post('/financeiro/pagamento', requireAuth, requirePermission('financeiro'), async (req, res) => {
  const { funcionario_id, ano_mes, valor_pago } = req.body;
  const paymentDate = req.body.data_pagamento || moment().format('YYYY-MM-DD');

  let employees = [];
  try {
    employees = (await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC'))[0];
  } catch(e) {}

  if (!funcionario_id || !ano_mes || valor_pago === undefined) {
    return res.status(400).render('error', { title: 'Erro', message: 'Funcionário, Mês e Valor são obrigatórios.' });
  }

  const numericValue = parseFloat(valor_pago) || 0;

  try {
    // Verificar se já existe registro de pagamento para este funcionário neste mês
    const [existing] = await db.query(
      'SELECT id FROM valores_pagos WHERE funcionario_id = ? AND ano_mes = ?',
      [funcionario_id, ano_mes]
    );

    if (existing.length > 0) {
      // Atualizar
      await db.query(
        'UPDATE valores_pagos SET valor_pago = ?, data_pagamento = ? WHERE id = ?',
        [numericValue, paymentDate, existing[0].id]
      );
    } else {
      // Inserir
      await db.query(
        'INSERT INTO valores_pagos (funcionario_id, ano_mes, valor_pago, data_pagamento) VALUES (?, ?, ?, ?)',
        [funcionario_id, ano_mes, numericValue, paymentDate]
      );
    }

    res.redirect(`/financeiro?mes=${ano_mes}`);
  } catch (error) {
    console.error('Erro ao registrar valor pago:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao registrar pagamento no banco de dados.' });
  }
});

module.exports = router;
