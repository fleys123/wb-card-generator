export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productName, category } = req.body;
  if (!productName?.trim()) return res.status(400).json({ error: 'Укажите название товара' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `Ты эксперт по продажам на Wildberries и Ozon.
Создай продающую карточку товара для: "${productName}"${category ? ` (категория: ${category})` : ''}.

Верни ТОЛЬКО валидный JSON без markdown-блоков и пояснений:
{
  "title": "SEO-заголовок до 100 символов с ключевыми словами для WB/Ozon",
  "description": "Продающее описание 400-600 символов. Выгоды, характеристики, для кого подходит. Ключевые слова вписаны органично.",
  "keywords": ["слово1", "слово2", "слово3", "слово4", "слово5", "слово6", "слово7", "слово8"],
  "characteristics": {
    "Характеристика 1": "значение",
    "Характеристика 2": "значение",
    "Характеристика 3": "значение",
    "Характеристика 4": "значение",
    "Характеристика 5": "значение"
  }
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Не удалось разобрать ответ AI' });

    const result = JSON.parse(jsonMatch[0]);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
