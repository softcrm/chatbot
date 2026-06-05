/**
 * 파일 경로: api/consult.js
 * 설명: 웹 브라우저의 API 요청을 안전하게 중개하여 Google Gemini API로 전달하는 Vercel 서버리스 함수입니다.
 * 이 파일은 사용자의 웹 브라우저에 전송되지 않고 오직 Vercel 클라우드 서버 백엔드 내에서 실행됩니다.
 */

export default async function handler(req, res) {
    // 1. CORS 가드 및 요청 메소드 확인
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: '허용되지 않는 메소드입니다. POST 요청만 허용합니다.' });
    }

    // 2. Vercel 대시보드에 기입할 환경변수 존재 유무 검증
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: '서버 환경에 GEMINI_API_KEY가 설정되지 않았습니다. Vercel Settings에서 환경변수를 추가해 주십시오.' 
        });
    }

    // 3. Gemini API 통신 처리 구성
    const modelName = "gemini-3.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        // 클라이언트로부터 전달받은 Body 페이로드를 그대로 Google API 엔드포인트로 전송
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        // 원격 API 응답 코드가 정상 범위가 아닌 경우 처리
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ 
                error: 'Gemini API 통신 도중 외부 인프라 에러가 발생했습니다.', 
                details: errorData 
            });
        }

        const data = await response.json();
        // 브라우저로 최종 통계 및 결과 데이터 반환
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ 
            error: '프록시 서버리스 함수 처리 과정 중 내부 에러가 발생했습니다.', 
            details: error.message 
        });
    }
}
