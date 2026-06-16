CREATE DATABASE IF NOT EXISTS jornada_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jornada_db;

-- Tabela de Configuração de Jornada Base
CREATE TABLE IF NOT EXISTS configuracao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entrada1_base TIME NOT NULL DEFAULT '08:00:00',
    saida1_base TIME NOT NULL DEFAULT '12:00:00',
    entrada2_base TIME NOT NULL DEFAULT '14:00:00',
    saida2_base TIME NOT NULL DEFAULT '18:00:00',
    tolerancia_minutos INT NOT NULL DEFAULT 5,
    carga_mensal_horas INT NOT NULL DEFAULT 220,
    empresa_nome VARCHAR(255) NOT NULL DEFAULT 'Minha Empresa'
);

-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cargo ENUM('motorista', 'ajudante') NOT NULL,
    salario DECIMAL(10, 2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários (Acesso ao Sistema)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    permissoes TEXT NOT NULL, -- JSON array de telas permitidas, ex: ["dashboard", "funcionarios"]
    funcionario_id INT NULL,   -- Vinculado a um funcionário se aplicável
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE SET NULL
);

-- Tabela de Dias Úteis CRUD (Exceções e Feriados)
CREATE TABLE IF NOT EXISTS dias_uteis_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL UNIQUE,
    status ENUM('util', 'nao_util') NOT NULL,
    descricao VARCHAR(255) NULL
);

-- Tabela de Registro de Jornada de Trabalho
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
);

-- Tabela de CRUD de Valores Pagos (Financeiro)
CREATE TABLE IF NOT EXISTS valores_pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionario_id INT NOT NULL,
    ano_mes VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
    valor_pago DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    data_pagamento DATE NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_funcionario_anomes (funcionario_id, ano_mes),
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
);
