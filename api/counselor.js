/**
 * api/counselor.js
 * Vercel Serverless Function (서버리스 함수)
 * 클라이언트의 Gemini API 호출을 대리 처리해 주는 프록시 역할의 백엔드 파일입니다.
 */

export default async function handler(req, res) {
    // 보안 강화를 위해 오직 POST 메서드 통신 요청만 통과시킵니다.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '허용되지 않는 잘못된 메서드 요청입니다.' });
    }

    // Vercel 환경 변수에 설정해 둔 안전한 API 키를 서버 메모리 레벨에서 안전하게 호출합니다.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '서버 환경에 Gemini API 키가 올바르게 설정되어 있지 않습니다.' });
    }

    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: '질문 내용이 누락되었습니다. 질문을 정확히 입력해 주세요.' });
    }

    // Google API 호출 주소 세팅 (보안된 환경 변수 API 키 매핑)
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-Lite:generateContent?key=${apiKey}`;

    // 시스템 프롬프트 가이드라인 정의
    const systemPrompt = `당신은 대한민국 대표 성민안경의 숙련되고 정직하며 자상한 '눈 건강 전문 인공지능 카운셀러'입니다.
고객이 안구 건조 상태, 시력 저하 대처 요령, 올바른 시각 보호 습관, 보정 렌즈 원리 등 눈 건강관리에 관해 문의하면 대단히 전문적이고 상세하게 한글로 답변해 주십시오.

[필수 규칙]
1. 답변의 마지막 부분이나 말미에는 반드시 "자세한 상담은 병원을 방문해야 합니다." 혹은 "정밀 진단 및 자세한 건강 상담은 전문 병원(안과)을 직접 방문하시길 권장드립니다."와 같은 의미를 지닌 병원 방문 필수 문장을 확실하고 정중하게 적어서 대답을 마쳐주십시오.
2. 답변은 읽기 쉽도록 조리 있고 체계적인 개행 단락 형태로 구성해 주십시오.`;

    const requestPayload = {
        contents: [{
            parts: [{
                text: question
            }]
        }],
        systemInstruction: {
            parts: [{
                text: systemPrompt
            }]
        }
    };

    try {
        const response = await fetch(googleApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            return res.status(response.status).json({ error: `외부 API 오류 상태: ${errorDetails}` });
        }

        const responseData = await response.json();
        const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "적절한 답변 데이터를 가져오지 못했습니다.";

        // 클라이언트로 간결하게 정리된 인공지능 답변만을 전달합니다.
        return res.status(200).json({ text: replyText });

    } catch (error) {
        return res.status(500).json({ error: `서버 통신 예외 상태가 검출되었습니다: ${error.message}` });
    }
}
