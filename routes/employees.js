const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Listagem de Funcionários
router.get('/funcionarios', requireAuth, requirePermission('funcionarios'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM funcionarios ORDER BY nome ASC');
    res.render('employees/index', {
      title: 'Funcionários',
      employees: rows
    });
  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao listar funcionários.' });
  }
});

// Formulário de Criação
router.get('/funcionarios/criar', requireAuth, requirePermission('funcionarios'), (req, res) => {
  res.render('employees/form', {
    title: 'Cadastrar Funcionário',
    employee: {},
    action: '/funcionarios/criar',
    error: null
  });
});

// Salvar Novo Funcionário
router.post('/funcionarios/criar', requireAuth, requirePermission('funcionarios'), async (req, res) => {
  const { nome, email, cargo, salario } = req.body;

  if (!nome || !email || !cargo || !salario) {
    return res.render('employees/form', {
      title: 'Cadastrar Funcionário',
      employee: req.body,
      action: '/funcionarios/criar',
      error: 'Por favor, preencha todos os campos.'
    });
  }

  try {
    // Validar e-mail duplicado
    const [existing] = await db.query('SELECT id FROM funcionarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('employees/form', {
        title: 'Cadastrar Funcionário',
        employee: req.body,
        action: '/funcionarios/criar',
        error: 'Este e-mail de funcionário já está cadastrado.'
      });
    }

    await db.query(
      'INSERT INTO funcionarios (nome, email, cargo, salario) VALUES (?, ?, ?, ?)',
      [nome, email, cargo, parseFloat(salario)]
    );
    res.redirect('/funcionarios');
  } catch (error) {
    console.error('Erro ao cadastrar funcionário:', error);
    res.render('employees/form', {
      title: 'Cadastrar Funcionário',
      employee: req.body,
      action: '/funcionarios/criar',
      error: 'Erro interno no servidor ao cadastrar funcionário.'
    });
  }
});

// Formulário de Edição
router.get('/funcionarios/editar/:id', requireAuth, requirePermission('funcionarios'), async (req, res) => {
  const empId = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM funcionarios WHERE id = ?', [empId]);
    if (rows.length === 0) {
      return res.status(404).render('error', { title: 'Não Encontrado', message: 'Funcionário não encontrado.' });
    }
    res.render('employees/form', {
      title: 'Editar Funcionário',
      employee: rows[0],
      action: `/funcionarios/editar/${empId}`,
      error: null
    });
  } catch (error) {
    console.error('Erro ao buscar funcionário para edição:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao buscar funcionário.' });
  }
});

// Salvar Edição de Funcionário
router.post('/funcionarios/editar/:id', requireAuth, requirePermission('funcionarios'), async (req, res) => {
  const empId = req.params.id;
  const { nome, email, cargo, salario } = req.body;

  try {
    // Validar e-mail duplicado em outro funcionário
    const [existing] = await db.query('SELECT id FROM funcionarios WHERE email = ? AND id != ?', [email, empId]);
    if (existing.length > 0) {
      return res.render('employees/form', {
        title: 'Editar Funcionário',
        employee: { id: empId, nome, email, cargo, salario },
        action: `/funcionarios/editar/${empId}`,
        error: 'Este e-mail de funcionário já está cadastrado em outro registro.'
      });
    }

    await db.query(
      'UPDATE funcionarios SET nome = ?, email = ?, cargo = ?, salario = ? WHERE id = ?',
      [nome, email, cargo, parseFloat(salario), empId]
    );
    res.redirect('/funcionarios');
  } catch (error) {
    console.error('Erro ao editar funcionário:', error);
    res.render('employees/form', {
      title: 'Editar Funcionário',
      employee: { id: empId, nome, email, cargo, salario },
      action: `/funcionarios/editar/${empId}`,
      error: 'Erro interno no servidor ao editar funcionário.'
    });
  }
});

// Excluir Funcionário
router.post('/funcionarios/excluir/:id', requireAuth, requirePermission('funcionarios'), async (req, res) => {
  const empId = req.params.id;
  try {
    await db.query('DELETE FROM funcionarios WHERE id = ?', [empId]);
    res.redirect('/funcionarios');
  } catch (error) {
    console.error('Erro ao excluir funcionário:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Não é possível excluir o funcionário, pois ele pode conter dados de jornada vinculados.',
      error
    });
  }
});

module.exports = router;
