const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');

const STOCKS_TABLE = process.env.STOCKS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;

let dynamoDb;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  })
  console.log(dynamoDb);
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
};


app.use(bodyParser.json({ strict: false }));

app.get('/', function (req, res) {
  res.send('Health check pass!')
});

// Get Stock endpoint
app.get('/stock/:symbol', function (req, res) {
  const params = {
    TableName: STOCKS_TABLE,
    Key: {
      symbol: req.params.symbol,
    },
  }

  dynamoDb.get(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not get stock' });
    }
    if (result.Item) {
      const {symbol, market, currency, description} = result.Item;
      res.json({ symbol, market, currency, description });
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  });
});

// Create Stock endpoint
app.post('/stock', function (req, res) {
  const { symbol, market, currency, description } = req.body;
  if (typeof symbol !== 'string') {
    res.status(400).json({ error: '"symbol" must be a string' });
  } else if (typeof market !== 'string') {
    res.status(400).json({ error: '"market" must be a string' });
  } else if (typeof currency !== 'string') {
    res.status(400).json({ error: '"currency" must be a string' });
  } else if (typeof description !== 'string') {
    res.status(400).json({ error: '"description" must be a string' });
  }

  const params = {
    TableName: STOCKS_TABLE,
    Item: {
      symbol: symbol,
      market: market,
      currency: currency,
      description: description
    },
  };
  
  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create stock due to db error.' });
    }
    res.json({ symbol });
  });
});

module.exports.handler = serverless(app);