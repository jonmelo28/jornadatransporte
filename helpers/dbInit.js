const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initializeDatabase() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    port: process.env.DB_PORT || 3306
  };

  const dbName = process.env.DB_NAME || 'jornada_db';

  try {
    const connection = await mysql.createConnection(connectionConfig);
    console.log('Conectado ao servidor MySQL para inicialização.');

    // 1. Criar o banco de dados
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Banco de dados "${dbName}" verificado/criado.`);
    await connection.end();

    // 2. Conectar ao banco específico para criar tabelas
    const dbConnection = await mysql.createConnection({
      ...connectionConfig,
      database: dbName
    });

    console.log('Criando tabelas...');

    // Tabela de Horários Padrão (turnos nomeados por empresa)
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS horarios_padrao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        entrada1_base TIME NOT NULL DEFAULT '08:00:00',
        saida1_base TIME NOT NULL DEFAULT '12:00:00',
        entrada2_base TIME NOT NULL DEFAULT '14:00:00',
        saida2_base TIME NOT NULL DEFAULT '18:00:00',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Tabela de Configuração
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS configuracao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entrada1_base TIME NOT NULL DEFAULT '08:00:00',
        saida1_base TIME NOT NULL DEFAULT '12:00:00',
        entrada2_base TIME NOT NULL DEFAULT '14:00:00',
        saida2_base TIME NOT NULL DEFAULT '18:00:00',
        tolerancia_minutos INT NOT NULL DEFAULT 5,
        carga_mensal_horas INT NOT NULL DEFAULT 220,
        empresa_nome VARCHAR(255) NOT NULL DEFAULT 'Minha Empresa'
      ) ENGINE=InnoDB;
    `);

    // Tabela de Funcionários
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        cargo ENUM('motorista', 'ajudante') NOT NULL,
        salario DECIMAL(10, 2) NOT NULL,
        horario_padrao_id INT NULL COMMENT 'FK para horarios_padrao - se NULL herda a configuração global',
        entrada1_base TIME NULL COMMENT 'Horário individual avulso (legado)',
        saida1_base TIME NULL,
        entrada2_base TIME NULL,
        saida2_base TIME NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (horario_padrao_id) REFERENCES horarios_padrao(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Migração silenciosa: adicionar colunas se o banco já existia antes desta versão
    const alterColumns = [
      "ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS horario_padrao_id INT NULL",
      "ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS entrada1_base TIME NULL",
      "ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS saida1_base TIME NULL",
      "ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS entrada2_base TIME NULL",
      "ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS saida2_base TIME NULL"
    ];
    for (const sql of alterColumns) {
      try { await dbConnection.query(sql); } catch (e) { /* coluna já existe, ignorar */ }
    }
    // Adicionar FK de migração (ignora erro se já existir ou se o banco não suporta ADD CONSTRAINT IF NOT EXISTS)
    try {
      await dbConnection.query(`
        ALTER TABLE funcionarios
        ADD CONSTRAINT fk_func_horario
        FOREIGN KEY (horario_padrao_id) REFERENCES horarios_padrao(id) ON DELETE SET NULL
      `);
    } catch (e) { /* FK já existe ou erro de duplicate, ignorar */ }

    // Tabela de Usuários
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        permissoes TEXT NOT NULL,
        funcionario_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Tabela de Dias Úteis CRUD
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS dias_uteis_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data DATE NOT NULL UNIQUE,
        status ENUM('util', 'nao_util') NOT NULL,
        descricao VARCHAR(255) NULL
      ) ENGINE=InnoDB;
    `);

    // Tabela de Jornadas
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS jornadas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        funcionario_id INT NOT NULL,
        data DATE NOT NULL,
        entrada1 TIME NULL,
        saida1 TIME NULL,
        entrada2 TIME NULL,
        saida2 TIME NULL,
        folga_periodo1 TINYINT(1) NOT NULL DEFAULT 0,
        folga_periodo2 TINYINT(1) NOT NULL DEFAULT 0,
        observacao TEXT NULL,
        UNIQUE KEY uq_funcionario_data (funcionario_id, data),
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Tabela de Valores Pagos
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS valores_pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        funcionario_id INT NOT NULL,
        ano_mes VARCHAR(7) NOT NULL,
        valor_pago DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        data_pagamento DATE NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_funcionario_anomes (funcionario_id, ano_mes),
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('Tabelas verificadas/criadas com sucesso.');

    // 3. Inserir Configuração Padrão se não houver nenhuma
    const [configs] = await dbConnection.query('SELECT COUNT(*) as count FROM configuracao');
    if (configs[0].count === 0) {
      await dbConnection.query(`
        INSERT INTO configuracao (entrada1_base, saida1_base, entrada2_base, saida2_base, tolerancia_minutos, carga_mensal_horas, empresa_nome)
        VALUES ('08:00:00', '12:00:00', '14:00:00', '18:00:00', 5, 220, 'Transportadora Antigravidade')
      `);
      console.log('Configuração padrão de jornada inserida.');
    }

    // 4. Inserir Usuário Administrador Padrão se não houver nenhum
    const [users] = await dbConnection.query('SELECT COUNT(*) as count FROM usuarios');
    if (users[0].count === 0) {
      const defaultAdminEmail = 'admin@admin.com';
      const defaultAdminPass = 'admin123';
      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash(defaultAdminPass, salt);
      
      // Permissões completas de todas as telas
      const defaultPermissions = JSON.stringify([
        'dashboard',
        'funcionarios',
        'usuarios',
        'configuracao',
        'jornada_cadastro',
        'dias_uteis',
        'financeiro',
        'relatorios'
      ]);

      await dbConnection.query(`
        INSERT INTO usuarios (nome, email, senha, permissoes)
        VALUES ('Administrador', ?, ?, ?)
      `, [defaultAdminEmail, hashedPass, defaultPermissions]);

      console.log(`Usuário administrador padrão criado: ${defaultAdminEmail} / ${defaultAdminPass}`);
    }

    await dbConnection.end();
    console.log('Banco de dados inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
    throw error;
  }
}

module.exports = initializeDatabase;
