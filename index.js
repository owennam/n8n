// index.js - PostgreSQL 저장 최종 버전
const express = require('express');
const { Pool } = require('pg'); // PostgreSQL 연결을 위한 라이브러리

// --- PostgreSQL 연결 풀 설정 ---
// Railway가 DATABASE_URL 환경 변수를 자동으로 주입해줍니다.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
app.post('/logs', async (req, res) => {
  const { workflowId, executionId, status, duration, ...restData } = req.body;

  const insertQuery = `
    INSERT INTO workflow_logs (workflow_id, execution_id, status, duration_ms, raw_data)
    VALUES ($1, $2, $3, $4, $5);
  `;
  const values = [workflowId, executionId, status, duration, restData];

  try {
    await pool.query(insertQuery, values);
    res.sendStatus(204); // 성공
  } catch (err) {
    console.error('Error inserting log into database:', err);
    res.sendStatus(500); // 서버 내부 오류
  }
});

// --- 서버 시작 ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Log API server listening on port ${PORT}`);
  createTableIfNotExists(); // 서버 시작 시 테이블 확인 및 생성
});