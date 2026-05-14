exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { productName, category } = JSON.parse(event.body || '{}');
  if (!productName?.trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Укажите название товара' }) };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
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
      return { statusCode: 502, headers, body: JSON.stringify({ error: err.error?.message || 'Gemini API error' }) };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Не удалось разобрать ответ AI' }) };

    const result = JSON.parse(jsonMatch[0]);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
