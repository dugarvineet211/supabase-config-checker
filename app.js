const express = require('express');
const {log, checks} = require('./routes/index');

const app = express();
const PORT = 3000;

app.use(express.json());

app.use('/log', log);
app.use('/checks', checks);
app.listen(PORT, (error) =>{
    if(!error) {
        console.log(`App started on port ${3000}`)
    }
    else 
        console.log("Error occurred, server can't start", error);
    }
);
