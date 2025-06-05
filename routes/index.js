const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.render('index', { titulo: 'Sistema HIS - Hospital' });
});

module.exports = router;
