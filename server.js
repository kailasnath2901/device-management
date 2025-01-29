const express = require('express');
const app = express();
const morgan = require('morgan');
const env = require('dotenv');
const sequelize = require('./config/sequelize');

env.config();

app.use(express.json());
app.use(morgan('dev'));

app.use('/api/user', require('./routes/user.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/user-devices', require('./routes/user-device.routes'));
// app.use('/api/admin', require('./routes/admin.routes'));

app.get('/test',(req,res) => {
    res.status(200).send('<h1> Node js project created with Sequelize </h1>')
});

const port = process.env.PORT;

const startServer = async () => {
    try {
        // Test database connection and sync models
        await sequelize.authenticate();
        await sequelize.sync({ alter: false }); // Change to false
        
        console.log('Connected to database');
        
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.log('Error connecting to database:', error);
    }
};

startServer();