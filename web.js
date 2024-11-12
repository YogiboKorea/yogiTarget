require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 5001;

// JSON 형식 파일 전송 예정
app.use(express.json());
app.use(cors({ origin: '*' }));

// MongoDB 연결 설정
const url = process.env.MONGODB_URI || 'mongodb://localhost:1000';
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

// 서버 시작
app.listen(PORT, () => {
    console.log(`SERVER OPEN on http://localhost:${PORT}`);
});
