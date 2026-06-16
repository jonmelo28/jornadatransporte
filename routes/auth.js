const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../helpers/db');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'jornadatransporte_segredo_jwt_super_secreto_2026';

// Tela de Login
router.get('/login', (req, res) => {
  if (req.cookies.token) {
    return res.redirect('/');
  }
  res.render('login', { layout: false, error: null });
});

// Processar Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.render('login', { layout: false, error: 'Por favor, preencha todos os campos.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      return res.render('login', { layout: false, error: 'E-mail ou senha incorretos.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(senha, user.senha);

    if (!isMatch) {
      return res.render('login', { layout: false, error: 'E-mail ou senha incorretos.' });
    }

    // Criar Token JWT
    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email,
        permissoes: user.permissoes,
        funcionario_id: user.funcionario_id
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Enviar token em cookie seguro httpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    res.redirect('/');
  } catch (error) {
    console.error('Erro no login:', error);
    res.render('login', { layout: false, error: 'Ocorreu um erro no servidor. Tente novamente mais tarde.' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Ver perfil próprio
router.get('/meu-perfil', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nome, email, funcionario_id FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.redirect('/logout');
    }
    res.render('meu-perfil', { title: 'Meu Perfil', profile: rows[0], success: null, error: null });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar perfil.' });
  }
});

// Atualizar perfil próprio
router.post('/meu-perfil', requireAuth, async (req, res) => {
  const { nome, email, senha } = req.body;
  const userId = req.user.id;

  try {
    // Verificar se e-mail já existe em outro usuário
    const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) {
      return res.render('meu-perfil', {
        title: 'Meu Perfil',
        profile: { id: userId, nome, email },
        success: null,
        error: 'Este e-mail já está sendo utilizado por outro usuário.'
      });
    }

    if (senha && senha.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash(senha, salt);
      await db.query('UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?', [nome, email, hashedPass, userId]);
    } else {
      await db.query('UPDATE usuarios SET nome = ?, email = ? WHERE id = ?', [nome, email, userId]);
    }

    // Atualizar os dados salvos na sessão (JWT Cookie) recreando o token
    const [updatedRows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
    const updatedUser = updatedRows[0];

    const token = jwt.sign(
      {
        id: updatedUser.id,
        nome: updatedUser.nome,
        email: updatedUser.email,
        permissoes: updatedUser.permissoes,
        funcionario_id: updatedUser.funcionario_id
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000
    });

    // Atualizar local para a página renderizar corretamente
    res.locals.user = jwt.verify(token, JWT_SECRET);

    res.render('meu-perfil', {
      title: 'Meu Perfil',
      profile: updatedUser,
      success: 'Perfil atualizado com sucesso!',
      error: null
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.render('meu-perfil', {
      title: 'Meu Perfil',
      profile: { id: userId, nome, email },
      success: null,
      error: 'Erro no servidor ao atualizar o perfil.'
    });
  }
});

module.exports = router;
