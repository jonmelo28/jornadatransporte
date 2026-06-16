const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'jornadatransporte_segredo_jwt_super_secreto_2026';

// Middleware para verificar se o usuário está autenticado
function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Tentar decodificar permissões se forem stringificadas
    if (typeof req.user.permissoes === 'string') {
      try {
        req.user.permissoes = JSON.parse(req.user.permissoes);
      } catch (e) {
        req.user.permissoes = [];
      }
    }

    // Tornar o usuário acessível globalmente nas views EJS
    res.locals.user = req.user;
    next();
  } catch (error) {
    console.error('Falha na autenticação JWT:', error);
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

// Middleware para verificar permissão para uma tela específica
function requirePermission(screen) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    const permissions = req.user.permissoes || [];
    
    // Admin tem acesso a tudo
    if (permissions.includes(screen)) {
      return next();
    }

    // Exceção de edição de si mesmo para tela de usuários
    if (screen === 'usuarios' && req.path.startsWith('/meu-perfil')) {
      return next();
    }

    // Acesso negado
    res.status(403).render('error', {
      title: 'Acesso Negado',
      message: 'Você não tem permissão para acessar esta tela.',
      error: { status: 403 }
    });
  };
}

module.exports = {
  requireAuth,
  requirePermission
};
