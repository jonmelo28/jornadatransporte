CREATE DATABASE IF NOT EXISTS jornada_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jornada_db;


CREATE TABLE `configuracao` (
  `id` int NOT NULL,
  `entrada1_base` time NOT NULL DEFAULT '08:00:00',
  `saida1_base` time NOT NULL DEFAULT '12:00:00',
  `entrada2_base` time NOT NULL DEFAULT '14:00:00',
  `saida2_base` time NOT NULL DEFAULT '18:00:00',
  `tolerancia_minutos` int NOT NULL DEFAULT '5',
  `carga_mensal_horas` int NOT NULL DEFAULT '220',
  `empresa_nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Minha Empresa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `configuracao`
--

INSERT INTO `configuracao` (`id`, `entrada1_base`, `saida1_base`, `entrada2_base`, `saida2_base`, `tolerancia_minutos`, `carga_mensal_horas`, `empresa_nome`) VALUES
(1, '08:00:00', '12:00:00', '14:00:00', '18:00:00', 5, 220, 'TSH Transportadora Santa Helena');

-- --------------------------------------------------------

--
-- Estrutura para tabela `dias_uteis_config`
--

CREATE TABLE `dias_uteis_config` (
  `id` int NOT NULL,
  `data` date NOT NULL,
  `status` enum('util','nao_util') COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `dias_uteis_config`
--

INSERT INTO `dias_uteis_config` (`id`, `data`, `status`, `descricao`) VALUES
(1, '2026-06-13', 'nao_util', 'FERIADO MUNICIPAL'),
(2, '2026-06-24', 'nao_util', 'FERIADO DE SÃO JOÃO');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios`
--

CREATE TABLE `funcionarios` (
  `id` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cargo` enum('motorista','ajudante') COLLATE utf8mb4_unicode_ci NOT NULL,
  `salario` decimal(10,2) NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `funcionarios`
--

INSERT INTO `funcionarios` (`id`, `nome`, `email`, `cargo`, `salario`, `criado_em`) VALUES
(1, 'Edson Vieira de Melo', 'edson@motorista.com', 'motorista', 2600.00, '2026-06-16 13:10:51'),
(2, 'Genivaldo', 'genivaldo@admin.com', 'ajudante', 2200.00, '2026-06-16 13:21:39');

-- --------------------------------------------------------

--
-- Estrutura para tabela `horarios_padrao`
--

CREATE TABLE `horarios_padrao` (
  `id` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entrada1_base` time NOT NULL DEFAULT '08:00:00',
  `saida1_base` time NOT NULL DEFAULT '12:00:00',
  `entrada2_base` time NOT NULL DEFAULT '14:00:00',
  `saida2_base` time NOT NULL DEFAULT '18:00:00',
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `jornadas`
--

CREATE TABLE `jornadas` (
  `id` int NOT NULL,
  `funcionario_id` int NOT NULL,
  `data` date NOT NULL,
  `entrada1` time DEFAULT NULL,
  `saida1` time DEFAULT NULL,
  `entrada2` time DEFAULT NULL,
  `saida2` time DEFAULT NULL,
  `folga_periodo1` tinyint(1) NOT NULL DEFAULT '0',
  `folga_periodo2` tinyint(1) NOT NULL DEFAULT '0',
  `observacao` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `jornadas`
--

INSERT INTO `jornadas` (`id`, `funcionario_id`, `data`, `entrada1`, `saida1`, `entrada2`, `saida2`, `folga_periodo1`, `folga_periodo2`, `observacao`) VALUES
(1, 1, '2026-06-16', '08:00:00', '12:00:00', '14:00:00', '18:00:00', 0, 0, ''),
(2, 2, '2026-06-16', '08:00:00', '12:00:00', '14:00:00', '18:00:00', 0, 0, '');

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissoes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `funcionario_id` int DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha`, `permissoes`, `funcionario_id`, `criado_em`) VALUES
(1, 'Administrador', 'admin@admin.com', '$2a$10$QTtMCSJXaW7gXe3ZVkF6EeAN9ZZC5YI6bKQKBp2hoNZWG2qwwRsne', '[\"dashboard\",\"funcionarios\",\"usuarios\",\"configuracao\",\"jornada_cadastro\",\"dias_uteis\",\"financeiro\",\"relatorios\"]', NULL, '2026-06-16 13:08:16');

-- --------------------------------------------------------

--
-- Estrutura para tabela `valores_pagos`
--

CREATE TABLE `valores_pagos` (
  `id` int NOT NULL,
  `funcionario_id` int NOT NULL,
  `ano_mes` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_pago` decimal(10,2) NOT NULL DEFAULT '0.00',
  `data_pagamento` date DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `configuracao`
--
ALTER TABLE `configuracao`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `dias_uteis_config`
--
ALTER TABLE `dias_uteis_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `data` (`data`);

--
-- Índices de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Índices de tabela `horarios_padrao`
--
ALTER TABLE `horarios_padrao`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `jornadas`
--
ALTER TABLE `jornadas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_funcionario_data` (`funcionario_id`,`data`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `funcionario_id` (`funcionario_id`);

--
-- Índices de tabela `valores_pagos`
--
ALTER TABLE `valores_pagos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_funcionario_anomes` (`funcionario_id`,`ano_mes`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `configuracao`
--
ALTER TABLE `configuracao`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `dias_uteis_config`
--
ALTER TABLE `dias_uteis_config`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `horarios_padrao`
--
ALTER TABLE `horarios_padrao`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `jornadas`
--
ALTER TABLE `jornadas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `valores_pagos`
--
ALTER TABLE `valores_pagos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `jornadas`
--
ALTER TABLE `jornadas`
  ADD CONSTRAINT `jornadas_ibfk_1` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `valores_pagos`
--
ALTER TABLE `valores_pagos`
  ADD CONSTRAINT `valores_pagos_ibfk_1` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE;
COMMIT;
