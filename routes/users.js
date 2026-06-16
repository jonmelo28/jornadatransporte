const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Listagem de Usuários do Sistema
router.get('/usuarios', requireAuth, requirePermission('usuarios'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.*, f.nome as funcionario_nome 
      FROM usuarios u 
      LEFT JOIN funcionarios f ON u.funcionario_id = f.id 
      ORDER BY u.nome ASC
    `);

    // Parsear as permissões de cada usuário para exibir
    const usersFormatted = rows.map(u => {
      let permissions = [];
      try {
        permissions = typeof u.permissoes === 'string' ? JSON.parse(u.permissoes) : u.permissoes;
      } catch (e) {
        permissions = [];
      }
      return {
        ...u,
        permissoes_arr: permissions
      };
    });

    res.render('users/index', {
      title: 'Usuários do Sistema',
      users: usersFormatted
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao listar usuários.' });
  }
});

// Formulário de Criação
router.get('/usuarios/criar', requireAuth, requirePermission('usuarios'), async (req, res) => {
  try {
    // Carregar funcionários para vincular se necessário
    const [employees] = await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC');
    res.render('users/form', {
      title: 'Cadastrar Usuário',
      userData: { permissoes: '[]' },
      employees,
      action: '/usuarios/criar',
      error: null
    });
  } catch (error) {
    console.error('Erro ao preparar formulário de usuário:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar dados.' });
  }
});

// Salvar Novo Usuário
router.post('/usuarios/criar', requireAuth, requirePermission('usuarios'), async (req, res) => {
  const { nome, email, senha, funcionario_id } = req.body;
  let { permissoes } = req.body;

  // Garantir que as permissões sejam salvas como array JSON em string
  if (!permissoes) {
    permissoes = [];
  } else if (!Array.isArray(permissoes)) {
    permissoes = [permissoes];
  }
  const permissoesStr = JSON.stringify(permissoes);

  try {
    const [employees] = await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC');

    if (!nome || !email || !senha) {
      return res.render('users/form', {
        title: 'Cadastrar Usuário',
        userData: { nome, email, funcionario_id, permissoes: permissoesStr },
        employees,
        action: '/usuarios/criar',
        error: 'Por favor, preencha todos os campos obrigatórios.'
      });
    }

    // Validar e-mail duplicado
    const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('users/form', {
        title: 'Cadastrar Usuário',
        userData: { nome, email, funcionario_id, permissoes: permissoesStr },
        employees,
        action: '/usuarios/criar',
        error: 'Este e-mail já está em uso.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(senha, salt);
    const funcId = funcionario_id ? parseInt(funcionario_id) : null;

    await db.query(
      'INSERT INTO usuarios (nome, email, senha, permissoes, funcionario_id) VALUES (?, ?, ?, ?, ?)',
      [nome, email, hashedPass, permissoesStr, funcId]
    );

    res.redirect('/usuarios');
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao cadastrar usuário.' });
  }
});

// Formulário de Edição
router.get('/usuarios/editar/:id', requireAuth, requirePermission('usuarios'), async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).render('error', { title: 'Não Encontrado', message: 'Usuário não encontrado.' });
    }

    const [employees] = await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC');

    res.render('users/form', {
      title: 'Editar Usuário',
      userData: rows[0],
      employees,
      action: `/usuarios/editar/${userId}`,
      error: null
    });
  } catch (error) {
    console.error('Erro ao carregar usuário para edição:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao buscar usuário.' });
  }
});

// Salvar Edição de Usuário
router.post('/usuarios/editar/:id', requireAuth, requirePermission('usuarios'), async (req, res) => {
  const userId = req.params.id;
  const { nome, email, senha, funcionario_id } = req.body;
  let { permissoes } = req.body;

  if (!permissoes) {
    permissoes = [];
  } else if (!Array.isArray(permissoes)) {
    permissoes = [permissoes];
  }
  const permissoesStr = JSON.stringify(permissoes);

  try {
    const [employees] = await db.query('SELECT id, nome FROM funcionarios ORDER BY nome ASC');

    // Validar e-mail duplicado
    const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) {
      return res.render('users/form', {
        title: 'Editar Usuário',
        userData: { id: userId, nome, email, funcionario_id, permissoes: permissoesStr },
        employees,
        action: `/usuarios/editar/${userId}`,
        error: 'Este e-mail já está sendo utilizado por outro usuário.'
      });
    }

    const funcId = funcionario_id ? parseInt(funcionario_id) : null;

    if (senha && senha.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash(senha, salt);
      await db.query(
        'UPDATE usuarios SET nome = ?, email = ?, senha = ?, permissoes = ?, funcionario_id = ? WHERE id = ?',
        [nome, email, hashedPass, permissoesStr, funcId, userId]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nome = ?, email = ?, permissoes = ?, funcionario_id = ? WHERE id = ?',
        [nome, email, permissoesStr, funcId, userId]
      );
    }

    res.redirect('/usuarios');
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao salvar alterações do usuário.' });
  }
});

// Excluir Usuário
router.post('/usuarios/excluir/:id', requireAuth, requirePermission('usuarios'), async (req, res) => {
  const userId = req.params.id;

  // Evitar excluir a si mesmo
  if (parseInt(userId) === req.user.id) {
    return res.status(400).render('error', { title: 'Ação Inválida', message: 'Você não pode excluir o seu próprio usuário de login atual.' });
  }

  try {
    await db.query('DELETE FROM usuarios WHERE id = ?', [userId]);
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao excluir usuário do sistema.' });
  }
});

module.exports = router;
