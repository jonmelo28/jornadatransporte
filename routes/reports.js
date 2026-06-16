const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { getEmployeeMonthlyData } = require('../helpers/reportHelper');
const { exportIndividualPDF, exportDriversCombinedPDF } = require('../helpers/pdfGenerator');
const moment = require('moment');

// Tela de Seleção de Relatórios
router.get('/relatorios', requireAuth, requirePermission('relatorios'), async (req, res) => {
  try {
    const [employees] = await db.query('SELECT id, nome, cargo FROM funcionarios ORDER BY nome ASC');
    res.render('reports/index', {
      title: 'Relatórios de Ponto',
      employees,
      selectedMonth: moment().format('YYYY-MM'),
      error: null
    });
  } catch (error) {
    console.error('Erro ao carregar tela de relatórios:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar tela de relatórios.' });
  }
});

// Visualizar Relatório em Tela
router.get('/relatorios/ver', requireAuth, requirePermission('relatorios'), async (req, res) => {
  const { funcionario_id, mes } = req.query;

  if (!funcionario_id || !mes) {
    return res.redirect('/relatorios');
  }

  try {
    const reportData = await getEmployeeMonthlyData(funcionario_id, mes);
    const [employees] = await db.query('SELECT id, nome, cargo FROM funcionarios ORDER BY nome ASC');

    res.render('reports/view', {
      title: `Folha de Ponto - ${reportData.employee.nome}`,
      employees,
      selectedEmployeeId: funcionario_id,
      selectedMonth: mes,
      reportData
    });
  } catch (error) {
    console.error('Erro ao gerar visualização do relatório:', error);
    res.status(500).render('error', { title: 'Erro', message: error.message || 'Erro ao carregar relatório.' });
  }
});

// Gerar PDF Individual do Funcionário
router.get('/relatorios/pdf', requireAuth, requirePermission('relatorios'), async (req, res) => {
  const { funcionario_id, mes } = req.query;

  if (!funcionario_id || !mes) {
    return res.status(400).send('Funcionário e Competência são obrigatórios.');
  }

  try {
    const reportData = await getEmployeeMonthlyData(funcionario_id, mes);
    exportIndividualPDF(res, reportData);
  } catch (error) {
    console.error('Erro ao gerar PDF individual:', error);
    res.status(500).send('Erro interno do servidor ao gerar o relatório em PDF.');
  }
});

// Gerar PDF de Todos os Motoristas (Consolidado)
router.get('/relatorios/pdf-todos-motoristas', requireAuth, requirePermission('relatorios'), async (req, res) => {
  const { mes } = req.query;

  if (!mes) {
    return res.status(400).send('A competência (Mês/Ano) é obrigatória.');
  }

  try {
    // 1. Obter todos os motoristas
    const [drivers] = await db.query("SELECT id FROM funcionarios WHERE cargo = 'motorista' ORDER BY nome ASC");

    if (drivers.length === 0) {
      return res.status(400).send('Não há motoristas cadastrados para gerar o relatório consolidado.');
    }

    // 2. Coletar os dados mensais de cada motorista
    const driversDataList = [];
    for (const d of drivers) {
      try {
        const reportData = await getEmployeeMonthlyData(d.id, mes);
        driversDataList.push(reportData);
      } catch (err) {
        console.error(`Erro ao carregar dados do motorista ID ${d.id}:`, err);
      }
    }

    if (driversDataList.length === 0) {
      return res.status(400).send('Erro ao obter dados dos motoristas.');
    }

    // 3. Gerar PDF consolidado
    exportDriversCombinedPDF(res, driversDataList, mes);
  } catch (error) {
    console.error('Erro ao gerar PDF de motoristas consolidado:', error);
    res.status(500).send('Erro interno ao gerar o PDF consolidado dos motoristas.');
  }
});

module.exports = router;
