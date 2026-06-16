const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Listar todos os horários padrão
router.get('/horarios-padrao', requireAuth, requirePermission('configuracao'), async (req, res) => {
  try {
    const [schedules] = await db.query(`
      SELECT hp.*, COUNT(f.id) as total_funcionarios
      FROM horarios_padrao hp
      LEFT JOIN funcionarios f ON f.horario_padrao_id = hp.id
      GROUP BY hp.id
      ORDER BY hp.nome ASC
    `);
    res.render('schedules/index', {
      title: 'Horários Padrão',
      schedules
    });
  } catch (error) {
    console.error('Erro ao listar horários padrão:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar horários padrão.' });
  }
});

// Formulário de criação
router.get('/horarios-padrao/criar', requireAuth, requirePermission('configuracao'), (req, res) => {
  res.render('schedules/form', {
    title: 'Novo Horário Padrão',
    schedule: {},
    action: '/horarios-padrao/criar',
    error: null
  });
});

// Salvar novo horário padrão
router.post('/horarios-padrao/criar', requireAuth, requirePermission('configuracao'), async (req, res) => {
  const { nome, entrada1_base, saida1_base, entrada2_base, saida2_base } = req.body;

  if (!nome || !entrada1_base || !saida1_base || !entrada2_base || !saida2_base) {
    return res.render('schedules/form', {
      title: 'Novo Horário Padrão',
      schedule: req.body,
      action: '/horarios-padrao/criar',
      error: 'Preencha todos os campos obrigatórios.'
    });
  }

  try {
    await db.query(
      'INSERT INTO horarios_padrao (nome, entrada1_base, saida1_base, entrada2_base, saida2_base) VALUES (?, ?, ?, ?, ?)',
      [nome, entrada1_base, saida1_base, entrada2_base, saida2_base]
    );
    res.redirect('/horarios-padrao');
  } catch (error) {
    console.error('Erro ao criar horário padrão:', error);
    res.render('schedules/form', {
      title: 'Novo Horário Padrão',
      schedule: req.body,
      action: '/horarios-padrao/criar',
      error: 'Erro interno ao salvar o horário padrão.'
    });
  }
});

// Formulário de edição
router.get('/horarios-padrao/editar/:id', requireAuth, requirePermission('configuracao'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM horarios_padrao WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).render('error', { title: 'Não Encontrado', message: 'Horário padrão não encontrado.' });
    }
    res.render('schedules/form', {
      title: 'Editar Horário Padrão',
      schedule: rows[0],
      action: `/horarios-padrao/editar/${req.params.id}`,
      error: null
    });
  } catch (error) {
    console.error('Erro ao buscar horário padrão:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar horário para edição.' });
  }
});

// Salvar edição
router.post('/horarios-padrao/editar/:id', requireAuth, requirePermission('configuracao'), async (req, res) => {
  const { nome, entrada1_base, saida1_base, entrada2_base, saida2_base } = req.body;
  const id = req.params.id;

  try {
    await db.query(
      'UPDATE horarios_padrao SET nome = ?, entrada1_base = ?, saida1_base = ?, entrada2_base = ?, saida2_base = ? WHERE id = ?',
      [nome, entrada1_base, saida1_base, entrada2_base, saida2_base, id]
    );
    res.redirect('/horarios-padrao');
  } catch (error) {
    console.error('Erro ao editar horário padrão:', error);
    res.render('schedules/form', {
      title: 'Editar Horário Padrão',
      schedule: { id, ...req.body },
      action: `/horarios-padrao/editar/${id}`,
      error: 'Erro interno ao salvar alterações.'
    });
  }
});

// Excluir horário padrão
router.post('/horarios-padrao/excluir/:id', requireAuth, requirePermission('configuracao'), async (req, res) => {
  try {
    const [used] = await db.query('SELECT COUNT(*) as c FROM funcionarios WHERE horario_padrao_id = ?', [req.params.id]);
    if (used[0].c > 0) {
      const [schedules] = await db.query(`
        SELECT hp.*, COUNT(f.id) as total_funcionarios
        FROM horarios_padrao hp
        LEFT JOIN funcionarios f ON f.horario_padrao_id = hp.id
        GROUP BY hp.id ORDER BY hp.nome ASC
      `);
      return res.render('schedules/index', {
        title: 'Horários Padrão',
        schedules,
        error: `Este horário está vinculado a ${used[0].c} funcionário(s) e não pode ser excluído. Desvincule os funcionários primeiro.`
      });
    }
    await db.query('DELETE FROM horarios_padrao WHERE id = ?', [req.params.id]);
    res.redirect('/horarios-padrao');
  } catch (error) {
    console.error('Erro ao excluir horário padrão:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao excluir horário padrão.' });
  }
});

module.exports = router;
