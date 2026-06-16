const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { getEmployeeMonthlyData } = require('../helpers/reportHelper');
const moment = require('moment');

router.get('/', requireAuth, requirePermission('dashboard'), async (req, res) => {
  const selectedMonth = req.query.mes || moment().format('YYYY-MM');

  try {
    // 1. Obter todos os funcionários
    const [employees] = await db.query('SELECT id, nome, cargo FROM funcionarios ORDER BY nome ASC');

    const motoristas = [];
    const ajudantes = [];

    // 2. Para cada funcionário, calcular o saldo de horas acumulado para o mês selecionado
    for (const emp of employees) {
      try {
        const monthlyData = await getEmployeeMonthlyData(emp.id, selectedMonth);
        emp.saldoHoras = monthlyData.summary.totalBalance;
        emp.saldoMins = monthlyData.summary.totalBalanceMins; // Útil para ordenação ou classes de CSS
      } catch (err) {
        console.error(`Erro ao calcular saldo para funcionário ${emp.id}:`, err);
        emp.saldoHoras = '00:00';
        emp.saldoMins = 0;
      }

      if (emp.cargo === 'motorista') {
        motoristas.push(emp);
      } else {
        ajudantes.push(emp);
      }
    }

    res.render('dashboard', {
      title: 'Painel Geral',
      motoristas,
      ajudantes,
      selectedMonth
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao carregar o painel geral de funcionários.',
      error
    });
  }
});

module.exports = router;
