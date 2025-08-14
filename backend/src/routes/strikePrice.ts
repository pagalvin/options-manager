import express from 'express';
import pool from '../database';

const router = express.Router();

// Update manual average strike price, option contracts, and recommended weekly premium for a symbol
router.put('/symbol/:symbol/strike-price', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { averageStrikePrice, optionContracts, recommendedWeeklyPremium } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    // Check if record exists
    const existingResult = await pool.query(`
      SELECT symbol FROM overlord.positions WHERE symbol = $1
    `, [symbol]);

    if (existingResult.rows.length === 0) {
      // For new symbols, we'll update an existing position or skip if none exists
      // Since this is meant for manual overrides, require an existing position
      return res.status(404).json({ 
        error: 'Position not found. Manual values can only be set for existing positions.',
        success: false
      });
    } else {
      // Update existing record
      let updateFields = ['last_updated = CURRENT_TIMESTAMP'];
      let values = [symbol];
      let valueIndex = 2;

      if (averageStrikePrice !== undefined) {
        updateFields.push(`manual_avg_strike_price = $${valueIndex}`);
        values.push(averageStrikePrice);
        valueIndex++;
      }

      if (optionContracts !== undefined) {
        updateFields.push(`manual_option_contracts = $${valueIndex}`);
        values.push(optionContracts);
        valueIndex++;
      }

      if (recommendedWeeklyPremium !== undefined) {
        updateFields.push(`recommended_weekly_premium = $${valueIndex}`);
        values.push(recommendedWeeklyPremium);
        valueIndex++;
      }

      const result = await pool.query(`
        UPDATE overlord.positions 
        SET ${updateFields.join(', ')}
        WHERE symbol = $1
        RETURNING *
      `, values);

      return res.json({ 
        success: true, 
        message: `Manual values updated for ${symbol}`,
        data: result.rows[0]
      });
    }

  } catch (error) {
    console.error('Error updating manual values:', error);
    res.status(500).json({ error: 'Failed to update manual values' });
  }
});

// Get manual average strike price, option contracts, and recommended weekly premium for a symbol
router.get('/symbol/:symbol/strike-price', async (req, res) => {
  try {
    const { symbol } = req.params;

    const result = await pool.query(`
      SELECT manual_avg_strike_price, manual_option_contracts, recommended_weekly_premium 
      FROM overlord.positions 
      WHERE symbol = $1
    `, [symbol]);

    if (result.rows.length === 0) {
      return res.json({ 
        manualAverageStrikePrice: null,
        manualOptionContracts: null,
        recommendedWeeklyPremium: null 
      });
    }

    res.json({ 
      manualAverageStrikePrice: result.rows[0].manual_avg_strike_price,
      manualOptionContracts: result.rows[0].manual_option_contracts,
      recommendedWeeklyPremium: result.rows[0].recommended_weekly_premium
    });

  } catch (error) {
    console.error('Error fetching manual values:', error);
    res.status(500).json({ error: 'Failed to fetch manual values' });
  }
});

export default router;
