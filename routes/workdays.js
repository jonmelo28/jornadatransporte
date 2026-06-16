const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const moment = require('moment');

// Tela de Lançamento / Edição de Jornada
router.get('/jornada/cadastro', requireAuth, requirePermission('jornada_cadastro'), async (req, res) => {
  const selectedEmployeeId = req.query.funcionario_id || '';
  const selectedDate = req.query.data || moment().format('YYYY-MM-DD');

  try {
    const [employees] = await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC');
    let jornada = {
      entrada1: '',
      saida1: '',
      entrada2: '',
      saida2: '',
      folga_periodo1: 0,
      folga_periodo2: 0,
      observacao: ''
    };

    if (selectedEmployeeId) {
      const [rows] = await db.query(
        'SELECT * FROM jornadas WHERE funcionario_id = ? AND data = ?',
        [selectedEmployeeId, selectedDate]
      );
      if (rows.length > 0) {
        jornada = rows[0];
        // Formatar horários TIME ('HH:MM:SS') para 'HH:MM' para renderizar no HTML5 <input type="time">
        if (jornada.entrada1) jornada.entrada1 = jornada.entrada1.substring(0, 5);
        if (jornada.saida1) jornada.saida1 = jornada.saida1.substring(0, 5);
        if (jornada.entrada2) jornada.entrada2 = jornada.entrada2.substring(0, 5);
        if (jornada.saida2) jornada.saida2 = jornada.saida2.substring(0, 5);
      }
    }

    res.render('workdays/form', {
      title: 'Lançamento de Jornada',
      employees,
      selectedEmployeeId,
      selectedDate,
      jornada,
      success: null,
      error: null
    });
  } catch (error) {
    console.error('Erro ao buscar dados de jornada:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar tela de jornada.' });
  }
});

// Salvar / Registrar Jornada
router.post('/jornada/cadastro', requireAuth, requirePermission('jornada_cadastro'), async (req, res) => {
  const {
    funcionario_id,
    data,
    entrada1,
    saida1,
    entrada2,
    saida2,
    observacao
  } = req.body;

  const folga_periodo1 = req.body.folga_periodo1 ? 1 : 0;
  const folga_periodo2 = req.body.folga_periodo2 ? 1 : 0;

  let employees = [];
  try {
    employees = (await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC'))[0];
  } catch (e) {
    console.error(e);
  }

  if (!funcionario_id || !data) {
    return res.render('workdays/form', {
      title: 'Lançamento de Jornada',
      employees,
      selectedEmployeeId: funcionario_id,
      selectedDate: data,
      jornada: req.body,
      success: null,
      error: 'Funcionário e Data são obrigatórios.'
    });
  }

  // Se folga estiver desmarcada e os campos de horário estiverem em branco, salvamos null no banco de dados.
  const ent1Val = (entrada1 && entrada1.trim() !== '') ? entrada1 : null;
  const sai1Val = (saida1 && saida1.trim() !== '') ? saida1 : null;
  const ent2Val = (entrada2 && entrada2.trim() !== '') ? entrada2 : null;
  const sai2Val = (saida2 && saida2.trim() !== '') ? saida2 : null;

  try {
    // Verificar se já existe registro
    const [existing] = await db.query(
      'SELECT id FROM jornadas WHERE funcionario_id = ? AND data = ?',
      [funcionario_id, data]
    );

    if (existing.length > 0) {
      // Atualizar
      await db.query(
        `UPDATE jornadas SET 
          entrada1 = ?, 
          saida1 = ?, 
          entrada2 = ?, 
          saida2 = ?, 
          folga_periodo1 = ?, 
          folga_periodo2 = ?, 
          observacao = ? 
         WHERE id = ?`,
        [ent1Val, sai1Val, ent2Val, sai2Val, folga_periodo1, folga_periodo2, observacao, existing[0].id]
      );
    } else {
      // Inserir novo
      await db.query(
        `INSERT INTO jornadas (funcionario_id, data, entrada1, saida1, entrada2, saida2, folga_periodo1, folga_periodo2, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [funcionario_id, data, ent1Val, sai1Val, ent2Val, sai2Val, folga_periodo1, folga_periodo2, observacao]
      );
    }

    // Recarregar dados salvos
    const [saved] = await db.query(
      'SELECT * FROM jornadas WHERE funcionario_id = ? AND data = ?',
      [funcionario_id, data]
    );
    const savedJornada = saved[0];
    if (savedJornada.entrada1) savedJornada.entrada1 = savedJornada.entrada1.substring(0, 5);
    if (savedJornada.saida1) savedJornada.saida1 = savedJornada.saida1.substring(0, 5);
    if (savedJornada.entrada2) savedJornada.entrada2 = savedJornada.entrada2.substring(0, 5);
    if (savedJornada.saida2) savedJornada.saida2 = savedJornada.saida2.substring(0, 5);

    res.render('workdays/form', {
      title: 'Lançamento de Jornada',
      employees,
      selectedEmployeeId: funcionario_id,
      selectedDate: data,
      jornada: savedJornada,
      success: 'Jornada gravada com sucesso!',
      error: null
    });
  } catch (error) {
    console.error('Erro ao salvar jornada:', error);
    res.render('workdays/form', {
      title: 'Lançamento de Jornada',
      employees,
      selectedEmployeeId: funcionario_id,
      selectedDate: data,
      jornada: req.body,
      success: null,
      error: 'Erro no servidor ao salvar jornada.'
    });
  }
});

module.exports = router;
