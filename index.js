const express = require('express')
const storage = require('./storage')
const app = express()
const port = 3000

app.use(express.json())

app.post('/users', (req, res) => {
    storage.createUser({
        name: req.body.name,
        email: req.body.email,
    })
        .then((user) => res.status(201).json(user))
        .catch((error) => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t save the user.' })
        })
})

app.post('/tasks', (req, res) => {
    storage.createTask({
        name: req.body.name,
    })
        .then((task) => res.status(201).json(task))
        .catch((error) => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t save the task.' })
        })
})

app.put('/tasks/:taskId', (req, res) => {
    storage.confirmTask(req.params.taskId)
        .then((task) => res.status(201).json(task))
        .catch((error) => {
            console.log(error)

            res.status(400).json({ error: 'Couldn\'t update the task.' })
        })
})

app.listen(port, () => console.log(`Tasks app listening at http://localhost:${port}`))
