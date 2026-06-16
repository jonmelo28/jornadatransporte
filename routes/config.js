const express = require('express');
const router = express.Router();
const db = require('../helpers/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Tela de Configuração
router.get('/configuracao', requireAuth, requirePermission('configuracao'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM configuracao LIMIT 1');
    const config = rows[0];
    res.render('config/index', {
      title: 'Configurações de Jornada',
      config,
      success: null,
      error: null
    });
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).render('error', { title: 'Erro', message: 'Erro ao carregar configurações.' });
  }
});

// Salvar Configuração
router.post('/configuracao', requireAuth, requirePermission('configuracao'), async (req, res) => {
  const {
    entrada1_base,
    saida1_base,
    entrada2_base,
    saida2_base,
    tolerancia_minutos,
    carga_mensal_horas,
    empresa_nome
  } = req.body;

  try {
    const [rows] = await db.query('SELECT id FROM configuracao LIMIT 1');
    
    if (rows.length === 0) {
      await db.query(
        `INSERT INTO configuracao (entrada1_base, saida1_base, entrada2_base, saida2_base, tolerancia_minutos, carga_mensal_horas, empresa_nome)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entrada1_base, saida1_base, entrada2_base, saida2_base, tolerancia_minutos, carga_mensal_horas, empresa_nome]
      );
    } else {
      await db.query(
        `UPDATE configuracao SET 
          entrada1_base = ?, 
          saida1_base = ?, 
          entrada2_base = ?, 
          saida2_base = ?, 
          tolerancia_minutos = ?, 
          carga_mensal_horas = ?, 
          empresa_nome = ? 
         WHERE id = ?`,
        [entrada1_base, saida1_base, entrada2_base, saida2_base, tolerancia_minutos, carga_mensal_horas, empresa_nome, rows[0].id]
      );
    }

    const [updatedRows] = await db.query('SELECT * FROM configuracao LIMIT 1');
    
    res.render('config/index', {
      title: 'Configurações de Jornada',
      config: updatedRows[0],
      success: 'Configurações salvas com sucesso!',
      error: null
    });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.render('config/index', {
      title: 'Configurações de Jornada',
      config: req.body,
      success: null,
      error: 'Erro no servidor ao salvar configurações.'
    });
  }
});

module.exports = router;
