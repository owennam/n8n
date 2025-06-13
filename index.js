// index.js
const express = require('express');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json()); // 최신 Express는 bodyParser가 내장됨

app.post('/logs', (req, res) => {
  const { workflowId, executionId, timestamp, status } = req.body;
  logger.info('Workflow log received', { workflowId, executionId, timestamp, status });
  res.sendStatus(204); // 204: No Content
});

const port = process.env.PORT || 3000;
app.listen(port, () => logger.info(`Log API listening on ${port}`));
