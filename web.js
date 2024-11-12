require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const PORT = 5001;

// JSON 형식 파일 전송 예정
app.use(express.json());
app.use(cors({ origin: '*' }));

// MongoDB 연결 설정
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';  // MongoDB 포트 확인
const dbName = 'yogiTarget';
let db;

// MongoDB 연결
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// 이벤트 클릭 데이터를 MongoDB에 저장하는 API
app.post('/event-click', async (req, res) => {
    const { event, timestamp } = req.body;

    if (!event || !timestamp) {
        return res.status(400).json({ error: 'Event type and timestamp are required' });
    }

    try {
        const collection = db.collection('clickEvents');
        const result = await collection.insertOne({ event, timestamp });

        console.log('Event stored in MongoDB:', result);
        res.status(201).json({ message: 'Event saved successfully', data: result });
    } catch (error) {
        console.error('Failed to save event:', error);
        res.status(500).json({ error: 'Failed to save event to MongoDB' });
    }
});
// 특정 날짜 범위의 클릭 데이터를 조회하는 API
app.get('/event-click', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
      const collection = db.collection('clickEvents');

      // 시작 날짜와 종료 날짜가 없으면 모든 데이터 반환
      let query = {};
      if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
          query = {
              timestamp: {
                  $gte: start,
                  $lte: end
              }
          };
      }

      const events = await collection.find(query).toArray();
      res.status(200).json(events);
  } catch (error) {
      console.error('Failed to retrieve events:', error);
      res.status(500).json({ error: 'Failed to retrieve events from MongoDB' });
  }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`SERVER OPEN on http://localhost:${PORT}`);
});
