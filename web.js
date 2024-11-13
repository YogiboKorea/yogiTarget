const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const XLSX = require('xlsx');
const app = express();
const PORT = 5001;

app.use(express.json());
app.use(cors({ origin: '*' }));

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
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

// 엑셀 다운로드 엔드포인트
app.get('/event-click/download', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const collection = db.collection('clickEvents');
    let query = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      query = { timestamp: { $gte: start, $lte: end } };
    }

    const events = await collection.find(query).toArray();

    const data = [["날짜", "구매하기 클릭", "장바구니 클릭"]];
    const dateCounts = {};

    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dateCounts[date]) {
        dateCounts[date] = { yogi_buy: 0, yogi_cart: 0 };
      }
      dateCounts[date][event.event]++;
    });

    Object.keys(dateCounts).forEach(date => {
      data.push([date, dateCounts[date].yogi_buy || 0, dateCounts[date].yogi_cart || 0]);
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
