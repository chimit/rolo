require('dotenv').config()
const bearerToken = require('express-bearer-token')
const express = require('express')
const storage = require('./storage')
const auth = require('./auth')
const app = express()
const port = process.env.PORT

app.use(express.json())
app.use(bearerToken())
app.use(auth)

app.post('/users', (req, res) => {
    storage.createUser({
        name: req.body.name,
        email: req.body.email,
    })
        .then(user => res.status(201).json(user))
        .catch(error => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t save the user.' })
        })
})

app.get('/tasks', (req, res) => {
    storage.getTasks(req.body)
        .then(tasks => res.status(200).json(tasks))
        .catch(error => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t get tasks.' })
        })
})

app.post('/tasks', (req, res) => {
    if (!req.user) {
        res.status(400).json({ error: 'Unauthenticated!' })
    }

    storage.createTask({
        user_id: req.user.id,
        name: req.body.name,
    })
        .then(task => res.status(201).json(task))
        .catch(error => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t save the task.' })
        })
})

app.put('/tasks/:taskId', (req, res) => {
    storage.confirmTask(req.params.taskId)
        .then(task => res.status(201).json(task))
        .catch(error => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t update the task.' })
        })
})

app.get('/tasks/:taskId', (req, res) => {
    storage.getTask(req.params.taskId)
        .then(task => res.status(200).json(task))
        .catch(error => {
            console.log(error)

            res.status(404).json({ error: 'Couldn\'t find the task.' })
        })
})

app.listen(port, () => console.log(`Tasks app listening at http://localhost:${port}`))
