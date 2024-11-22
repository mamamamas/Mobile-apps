const express = require('express');

const { getallItems, getItems, addItems, updateItems, deleteItems, searchItem } = require('../controller/inventoryController')
const router = express.Router();

router.get('/', getallItems),

    router.get('/:id', getItems);

router.post('/add', addItems);

router.put('/item/:id', updateItems)

router.delete('/item/:id', deleteItems);

router.get('/search', searchItem)

module.exports = router;