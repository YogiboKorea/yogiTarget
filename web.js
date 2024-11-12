require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const PORT = 5001;

app.use(express.json());
app.use(cors({ origin: '*' }));

// MongoDB 연결 설정
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
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

// 클릭 이벤트 저장 API
app.post('/event-click', async (req, res) => {
    const { event, timestamp } = req.body;
    if (!event || !timestamp) {
        return res.status(400).json({ error: 'Event type and timestamp are required' });
    }

    try {
        const collection = db.collection('clickEvents');
        const result = await collection.insertOne({ event, timestamp: new Date(timestamp) });
        console.log('Event stored in MongoDB:', result);
        res.status(201).json({ message: 'Event saved successfully', data: result });
    } catch (error) {
        console.error('Failed to save event:', error);
        res.status(500).json({ error: 'Failed to save event to MongoDB' });
    }
});

// 날짜 범위 내 데이터 조회 API
app.get('/event-click', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
      const collection = db.collection('clickEvents');
      let query = {};
      if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

          query = { timestamp: { $gte: start, $lte: end } };
      }

      console.log("Query being used:", query); // 디버깅용 로그 추가
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
