require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const XLSX = require('xlsx');
const app = express();
const PORT = 5001;

app.use(express.json());
app.use(cors({ origin: '*' }));

// MongoDB 연결 설정
const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = 'yogiTarget';
let db;

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// 차단할 IP 목록
const BLOCKED_IPS = ['10.31.50.28', '111.222.333.444']; // 차단하고 싶은 IP 추가

// IP 차단 미들웨어
app.use((req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // IPv6 형식에서 IPv4 추출 (ex. "::ffff:192.168.0.1")
    const parsedIp = clientIp.includes('::ffff:') ? clientIp.split('::ffff:')[1] : clientIp;

    if (BLOCKED_IPS.includes(parsedIp)) {
        console.log(`Blocked request from IP: ${parsedIp}`);
        return res.status(403).json({ error: '이 IP는 요청이 차단되었습니다.' });
    }

    next();
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

        console.log('Query:', query);
        const events = await collection.find(query).toArray();
        console.log('Fetched events:', events);

        res.status(200).json(events);
    } catch (error) {
        console.error('Failed to retrieve events:', error);
        res.status(500).json({ error: 'Failed to retrieve events from MongoDB' });
    }
});

// 엑셀 다운로드 엔드포인트
app.get('/event-click/download', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
    }

    try {
        const collection = db.collection('clickEvents');
        const start = new Date(startDate);
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        const query = { timestamp: { $gte: start, $lte: end } };

        const events = await collection.find(query).toArray();

        // 날짜 범위에 클릭률 0 초기화
        const dateCounts = {};
        for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split('T')[0];
            dateCounts[date] = { yogi_buy: 0, yogi_cart: 0 };
        }

        // 이벤트 데이터를 날짜별로 집계
        events.forEach(event => {
            const date = new Date(event.timestamp).toISOString().split('T')[0];
            if (!dateCounts[date]) {
                dateCounts[date] = { yogi_buy: 0, yogi_cart: 0 };
            }
            dateCounts[date][event.event]++;
        });

        // 엑셀 데이터 변환
        const data = [["날짜", "웹 클릭", "모바일 클릭"]];
        Object.keys(dateCounts).forEach(date => {
            data.push([date, dateCounts[date].yogi_buy, dateCounts[date].yogi_cart]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ClickStats");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="ClickStats.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Failed to create Excel file:', error);
        res.status(500).json({ error: 'Failed to create Excel file' });
    }
});

app.listen(PORT, () => {
    console.log(`SERVER OPEN on http://localhost:${PORT}`);
});
