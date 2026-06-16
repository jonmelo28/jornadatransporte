const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const moment = require('moment');

// Listar datas de exceção (Dias Úteis CRUD)
router.get('/dias-uteis', requireAuth, requirePermission('dias_uteis'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT *, DATE_FORMAT(data, "%Y-%m-%d") as date_str FROM dias_uteis_config ORDER BY data DESC'
    );
    res.render('working-days/index', {
      title: 'Calendário - Dias Úteis',
      exceptions: rows,
      success: null,
      error: null
    });
  } catch (error) {
    console.error('Erro ao buscar calendário:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar dias úteis.' });
  }
});

// Criar Exceção
router.post('/dias-uteis/criar', requireAuth, requirePermission('dias_uteis'), async (req, res) => {
  const { data, status, descricao } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT *, DATE_FORMAT(data, "%Y-%m-%d") as date_str FROM dias_uteis_config ORDER BY data DESC'
    );

    if (!data || !status) {
      return res.render('working-days/index', {
        title: 'Calendário - Dias Úteis',
        exceptions: rows,
        success: null,
        error: 'Data e Status são obrigatórios.'
      });
    }

    // Tentar inserir (se já existir, lança erro por chave única)
    await db.query(
      'INSERT INTO dias_uteis_config (data, status, descricao) VALUES (?, ?, ?)',
      [data, status, descricao]
    );

    res.redirect('/dias-uteis');
  } catch (error) {
    console.error('Erro ao criar dia de exceção:', error);
    
    // Buscar novamente para renderizar o erro
    let exceptionsList = [];
    try {
      exceptionsList = (await db.query('SELECT *, DATE_FORMAT(data, "%Y-%m-%d") as date_str FROM dias_uteis_config ORDER BY data DESC'))[0];
    } catch(e) {}

    res.render('working-days/index', {
      title: 'Calendário - Dias Úteis',
      exceptions: exceptionsList,
      success: null,
      error: error.code === 'ER_DUP_ENTRY' 
        ? 'Esta data já possui uma configuração personalizada registrada.' 
        : 'Erro interno no servidor ao gravar exceção.'
    });
  }
});

// Excluir Exceção
router.post('/dias-uteis/excluir/:id', requireAuth, requirePermission('dias_uteis'), async (req, res) => {
  const excId = req.params.id;
  try {
    await db.query('DELETE FROM dias_uteis_config WHERE id = ?', [excId]);
    res.redirect('/dias-uteis');
  } catch (error) {
    console.error('Erro ao excluir exceção de calendário:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao excluir dia personalizado.' });
  }
});

module.exports = router;
