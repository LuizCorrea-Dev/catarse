
export interface RiskAnalysis {
  riskLevel: 'high' | 'low';
  confidence: number;
  flags: string[];
}

class AIService {
  /**
   * Simula a análise de risco de posts para manter o bem-estar da rede.
   */
  public async analyzePostRisk(text: string): Promise<RiskAnalysis> {
    console.log(`[Backend AI] Analyzing: "${text.substring(0, 20)}..."`);
    
    // Basic mock logic: keywords trigger high risk
    const toxicKeywords = ['ódio', 'ataque', 'violência', 'matar', 'bullying'];
    const hasToxic = toxicKeywords.some(word => text.toLowerCase().includes(word));

    return {
      riskLevel: hasToxic ? 'high' : 'low',
      confidence: hasToxic ? 0.95 : 0.98,
      flags: hasToxic ? ['potential_harmful_content'] : []
    };
  }
}

export const aiService = new AIService();
