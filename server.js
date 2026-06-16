const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const initializeDatabase = require('./helpers/dbInit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar banco de dados e rodar servidor
async function startServer() {
  try {
    // Inicializar Tabelas e Sementes do MySQL
    await initializeDatabase();
    
    // Iniciar escuta HTTP
    app.listen(PORT, () => {
      console.log(`Servidor rodando com sucesso na porta ${PORT}.`);
      console.log(`Acesse: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Falha crítica ao iniciar o servidor (Banco de Dados offline?):', error);
    process.exit(1);
  }
}

// Configurar EJS e EJS Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // Nome do arquivo de layout padrão (layout.ejs)

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para disponibilizar variáveis comuns globais em todas as views EJS
app.use((req, res, next) => {
  res.locals.title = 'Controle de Jornada';
  res.locals.user = null; // Sobrescrito pelo auth middleware se logado
  res.locals.path = req.path;
  next();
});

// Importar e Montar Rotas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const userRoutes = require('./routes/users');
const configRoutes = require('./routes/config');
const workdayRoutes = require('./routes/workdays');
const workingDaysRoutes = require('./routes/workingDays');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');

// Registrar rotas
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', employeeRoutes);
app.use('/', userRoutes);
app.use('/', configRoutes);
app.use('/', workdayRoutes);
app.use('/', workingDaysRoutes);
app.use('/', paymentRoutes);
app.use('/', reportRoutes);

// Rota para tratamento de páginas não encontradas (404)
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Página Não Encontrada',
    message: 'A página que você está procurando não existe ou foi movida.',
    error: { status: 404 }
  });
});

// Tratamento de Erros Globais do Express
app.use((err, req, res, next) => {
  console.error('Erro geral no Express:', err.stack);
  res.status(500).render('error', {
    title: 'Erro Interno',
    message: 'Ocorreu um erro inesperado no servidor.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

startServer();
