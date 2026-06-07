// api/chat.js
export default async function handler(req, res) {
    // CORS 및 보안 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { contents } = req.body;
        if (!contents) {
            return res.status(400).json({ error: '요청 본문에 contents 데이터가 누락되었습니다.' });
        }

        // 1. Vercel 환경 변수에서 구글 시트 CSV 주소를 가져와 실시간 데이터 패치
        const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL;
        if (!sheetUrl) {
            return res.status(500).json({ error: '구글 시트 환경 변수가 설정되지 않았습니다.' });
        }
        const sheetResponse = await fetch(sheetUrl);
        const csvKnowledgeBase = await sheetResponse.text();

        // 2. 제미나이 API 지침(프롬프트) 설계: 구글 시트 데이터를 지식베이스로 주입
        const systemPrompt = `당신은 홈페이지 안내 전문 상담원입니다.
아래 제공되는 [구글 시트 지식베이스]의 내용을 엄격하게 준수하여 사용자의 질문에 정확하게 답변하세요.
만약 사용자의 질문에 대답할 수 있는 정보가 지식베이스에 없다면, 함부로 답변을 지어내지 말고 "해당 정보는 지식베이스에 등록되어 있지 않아 확인 후 안내해 드리겠습니다"라고 정중하게 답변하세요.

[구글 시트 지식베이스 데이터 (CSV 형식)]
${csvKnowledgeBase}`;

        // 3. 제미나이 API 호출 설정
        const apiKey = process.env.GEMINI_API_KEY;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API 오류: ${errorText}`);
        }

        const data = await geminiResponse.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('서버리스 함수 에러:', error);
        return res.status(500).json({ error: error.message || '서버 내부 오류가 발생했습니다.' });
    }
}
