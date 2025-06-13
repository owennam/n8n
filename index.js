// index.js - 모든 네트워크 인터페이스 리스닝 최종 버전
const express = require('express');
const { Pool } = require('pg'); // PostgreSQL 연결을 위한 라이브러리

// --- PostgreSQL 연결 설정 ---
// Railway가 자동으로 주입해주는 개별 환경 변수를 사용합니다.
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT, 10), // 포트 번호는 정수여야 합니다.
  ssl: {
    rejectUnauthorized: false // Railway DB 연결에 필요한 SSL 옵션
  }
});

// --- DB 테이블 자동 생성 함수 ---
const createTableIfNotExists = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS workflow_logs (
      id SERIAL PRIMARY KEY,
      workflow_id VARCHAR(255),
      execution_id VARCHAR(255),
      status VARCHAR(50),
      duration_ms INT,
      log_timestamp TIMESTAMPTZ DEFAULT NOW(),
      raw_data JSONB
    );
  `;
  try {
    await pool.query(query);
    console.log('Table "workflow_logs" is ready.');
  } catch (err) {
    console.error('Unable to ensure table "workflow_logs" exists:', err);
  }
};

// --- Express 앱 설정 ---
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- API 엔드포인트 ---

// 1. 헬스 체크 엔드포인트: 서버가 살아있는지 확인
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. 로그 수집 엔드포인트
app.post('/logs', async (req, res) => {
  const { workflowId, executionId, status, duration, ...restData } = req.body;

  const insertQuery = `
    INSERT INTO workflow_logs (workflow_id, execution_id, status, duration_ms, raw_data)
    VALUES ($1, $2, $3, $4, $5);
  `;
  const durationInMs = duration !== undefined ? duration : null;
  const values = [workflowId, executionId, status, durationInMs, restData];

  try {
    await pool.query(insertQuery, values);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error inserting log into database:', err);
    res.sendStatus(500);
  }
});

// --- 서버 시작 ---
// '0.0.0.0'을 제거하여 사용 가능한 모든 인터페이스(IPv4, IPv6)에서 리스닝합니다.
app.listen(PORT, () => {
  console.log(`Log API server listening on all interfaces at port ${PORT}`);
  createTableIfNotExists();
});