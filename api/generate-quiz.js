export default async function handler(req, res) {
  const { category } = req.query;
  const categoryLabel = { fruit: '과일', animal: '동물', object: '사물' }[category];

  if (!categoryLabel) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `${categoryLabel} 카테고리로 수수께끼 퀴즈 5문제를 만들어주세요. 시니어가 풀 수 있는 쉬운 난이도로 해주세요.
각 문제는 JSON 배열로 출력하세요. 다른 텍스트 없이 JSON만 출력하세요.
형식: [{"hint":"힌트 문장","answer":"정답","wrong":["오답1","오답2"]}]
hint는 사물의 특징을 설명하는 수수께끼이고, answer는 정답, wrong는 오답 2개입니다.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text?.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.length >= 1 && parsed.every(q => q.hint && q.answer && q.wrong?.length === 2)) {
        return res.status(200).json(parsed);
      }
    }

    return res.status(200).json([]);
  } catch {
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}
