// index.js

// 1. 필요한 라이브러리 불러오기
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config(); // .env 파일 사용 설정

const app = express();
app.use(express.json()); // 요청 본문의 JSON을 파싱하기 위함
app.use(cors()); // CORS 허용

// 2. DB 연결 설정
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

// 3. 로그인 API 엔드포인트(경로) 생성
// POST 방식으로 /login 경로에 요청이 오면 이 코드가 실행됨
app.post('/login', async (req, res) => {
    try {
        // 4. 사용자가 보낸 아이디와 비밀번호 받기
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
        }
        
        // 5. DB에서 사용자 찾기
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
        await connection.end();

        // 6. 사용자가 존재하지 않는 경우
        if (rows.length === 0) {
            // "존재하지 않는 아이디"라고 알려주면 보안에 취약하므로, 포괄적인 메시지 사용
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const user = rows[0];

        // 7. 비밀번호 비교 (가장 중요)
        // 사용자가 입력한 비밀번호(password)와 DB에 저장된 해시(user.password_hash)를 비교
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordMatch) {
            // 비밀번호가 틀린 경우
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        // 8. 로그인 성공: JWT(임시 출입증) 생성
        const token = jwt.sign(
            { id: user.id, userId: user.user_id }, // 토큰에 담을 정보
            process.env.JWT_SECRET, // 서명에 사용할 비밀키
            { expiresIn: '1h' } // 유효기간 (예: 1시간)
        );

        // 9. 성공 응답과 함께 토큰 전송
        res.status(200).json({ message: '로그인 성공!', token: token });

    } catch (error) {
        console.error('로그인 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`${PORT}번 포트에서 서버가 실행되었습니다.`);
});