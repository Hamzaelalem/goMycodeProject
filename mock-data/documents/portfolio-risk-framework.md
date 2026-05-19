# Portfolio Risk Framework & Factor Methodology — 2026

## Overview
CLIENT's risk scoring engine maintains live risk scores (0–100) across seven risk factors. Scores are computed from structured market data inputs and sentiment signals from the Talkwalker social intelligence integration. Risk scores feed directly into the recommendation confidence score calculation.

## The Seven Risk Factors

### 1. Geopolitical Instability (Current Score: 72)
Measures political risk, conflict exposure, and diplomatic tensions across portfolio geographies.

Data sources: Bloomberg Country Risk Monitor, ACLED conflict data, Talkwalker geopolitical sentiment.

Calculation: Weighted average of (Political Stability Index × 0.4) + (Conflict Proximity Score × 0.3) + (Diplomatic Risk Score × 0.3).

Threshold levels: 0-30 (Low), 31-55 (Medium), 56-75 (High), 76-100 (Critical).

Current note: Elevated due to tensions in North Africa (Libya) and Red Sea shipping disruptions affecting East African imports.

### 2. Currency Volatility (Current Score: 58)
Measures FX risk across portfolio country exposures, particularly USD/local currency movements.

Data sources: Bloomberg FX data, Central Bank reserves data.

Key exposures: KES (Kenya), NGN (Nigeria), TZS (Tanzania), EGP (Egypt).

Calculation: Volatility-weighted basket of portfolio country currency movements vs. USD, normalized 0-100.

Current note: KES stabilized after Q4 2025 depreciation. NGN remains elevated (32% depreciation in 2024).

### 3. Regulatory Change (Current Score: 45)
Tracks pace and direction of regulatory change in portfolio sectors and geographies.

Data sources: Regulatory authority publications, Talkwalker policy signals, internal legal team inputs.

Sub-components: (Sector Regulatory Risk × 0.5) + (Country Regulatory Risk × 0.5).

Current note: Kenya energy sector reform ongoing (positive). Nigeria PIB implementation creating short-term uncertainty.

### 4. Commodity Price Risk (Current Score: 63)
Measures sensitivity of portfolio to commodity price movements (oil, gas, agricultural commodities).

Data sources: Bloomberg commodity futures, OPEC production data.

Portfolio commodity exposure: Oil & Gas (22% of AUM), Solar equipment (supply chain exposure), Agriculture.

Calculation: Portfolio-weighted commodity beta, normalized to 0-100.

### 5. Liquidity Risk (Current Score: 41)
Measures ability to exit investments and portfolio company access to capital markets.

Sub-components: Market Liquidity (public market depth), Asset Liquidity (PE/private market exit timeline), Refinancing Risk.

Current note: LOW risk. Portfolio weighted average exit horizon is 4.2 years. Dry powder from limited partners remains strong.

### 6. ESG Compliance Risk (Current Score: 55)
Measures risk of portfolio companies failing to meet CLIENT ESG targets or regulatory ESG requirements.

Data sources: Portfolio company ESG reports, Talkwalker ESG sentiment, regulatory filings.

Current portfolio ESG score: 69/100. Gap to target (75) creates medium ESG compliance risk.

Key ESG risk: Oil & Gas sector environmental score drag (54/100).

### 7. Counterparty Risk (Current Score: 37)
Measures risk of portfolio counterparties (offtake buyers, lenders, government entities) failing to meet obligations.

Sub-components: Offtake counterparty risk, Lender counterparty risk, Government counterparty risk.

Current note: LOW-MEDIUM risk. Kenya Power offtake agreements carry government guarantee. Nigerian NNPC payment history improved.

## Confidence Score Integration
Recommendation confidence scores are computed as:

Base Score (LLM output) × (1 - Risk Penalty)

Risk Penalty = MAX(0, (Composite Risk Score - 50) / 200)

Composite Risk Score = Weighted average of 7 factors (weights vary by recommendation sector/region).

If confidence deviation > 15 points from risk-adjusted estimate → flagged for human review.

## Risk Monitoring Cadence
- Real-time: Talkwalker sentiment signals (continuous)
- Daily: Bloomberg market data refresh
- Weekly: Full risk score recalculation
- Monthly: Manual review and validation by Risk Officer
