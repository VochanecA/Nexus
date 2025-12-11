// lib/provenance/ai-detection.ts
export class AIDetection {
  static async detectAI(content: string): Promise<boolean> {
    // Jednostavna heuristika - može se zamijeniti sa API pozivom
    const indicators = [
      /as an ai/gi,
      /language model/gi,
      /i'm sorry/gi,  // Često korišteno od AI
      /cannot.*because/gi,
      /based on.*training/gi
    ];
    
    let score = 0;
    indicators.forEach(pattern => {
      if (pattern.test(content)) score++;
    });
    
    // Duži, perfektno formatirani tekst
    if (content.length > 500 && 
        content.split('.').length > 5 &&
        content.includes('\n')) {
      score++;
    }
    
    return score >= 2;
  }
}