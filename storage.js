const config = require('./config')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const mysql = require('mysql')
const redis = require('redis')

const pool = mysql.createPool(config.mysql)

const redisClient = redis.createClient(config.redis)

redisClient.on('error', function (err) {
    console.log('Error ' + err)
})

function authenticate(token) {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM users WHERE token = ?', token, (error, results, fields) => {
            if (error) {
                console.log('Error getting user!')

                reject(error)
            } else if (!results[0]) {
                // Do not throw an error to allow public endpoints
                resolve()
            } else {
                resolve({
                    id: results[0].id,
                    name: results[0].name,
                    email: results[0].email,
                })
            }
        })
    })
}

function createUser(params) {
    return new Promise((resolve, reject) => {
        let token = crypto.randomBytes(32).toString('hex')

        pool.query('INSERT INTO users SET ?', {
            name: params.name,
            email: params.email,
            token
        }, (error, results, fields) => {
            if (error) {
                console.log('Error saving user!')
                
                reject(error)
            } else {
                console.log('User is saved.')

                resolve({
                    id: results.insertId,
                    name: params.name,
                    email: params.email,
                    token,
                })
            }
        })
    })
}

function getTasks(params) {
    // @todo Make safer search
    return new Promise((resolve, reject) => {
        let query = `SELECT tasks.id, tasks.uuid, tasks.user_id, tasks.name, tasks.consumed
            FROM tasks, users
            WHERE tasks.user_id = users.id AND ?`

        pool.query(query, params, (error, results, fields) => {
            if (error) {
                console.log('Error getting tasks from the queue!')

                reject(error)
            } else if (results.length === 0) {
                reject(new Error('No tasks found for this user in the queue!'))
            } else {
                resolve(results.map(task => {
                    return {
                        uuid: task.uuid,
                        user_id: task.user_id,
                        name: task.name,
                        status: task.consumed ? 'consumed' : 'queued',
                    }
                }))
            }
        })
    })
}

function createTask(params) {
    return new Promise((resolve, reject) => {
        let uuid = uuidv4()

        redisClient
            .multi()
            .hmset('task:' + uuid, params)
            .expireat('task:' + uuid, parseInt((+new Date) / 1000) + 86400)
            .exec((error, replies) => {
                if (error) {
                    console.log(error)

                    reject(error)
                } else {
                    console.log('New drafted task is created.')

                    resolve({
                        uuid: uuid,
                        user_id: params.user_id,
                        name: params.name,
                        status: 'drafted',
                    })
                }
            })
    })
}

function confirmTask(uuid) {
    return getTaskFromDrafts(uuid)
        .then(task => putTaskIntoQueue(task))
        .then(task => {
            removeTaskFromDrafts(task.uuid)

            return task
        })
}

function getTask(uuid) {
    return getTaskFromDrafts(uuid)
        .then(
            task => task,
            error => getTaskFromQueue(uuid)
        )
}

function getTaskFromDrafts(uuid) {
    return new Promise((resolve, reject) => {
        redisClient.hgetall('task:' + uuid, (error, value) => {
            if (error) {
                console.log(value)

                reject(error)
            } else if (!value) {
                reject(new Error('Draft not found!'))
            } else {
                resolve({
                    uuid: uuid,
                    user_id: parseInt(value.user_id),
                    name: value.name,
                    status: 'drafted',
                })
            }
        })
    })
}

function getTaskFromQueue(uuid) {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM tasks WHERE uuid = ?', uuid, (error, results, fields) => {
            if (error) {
                console.log('Error getting task from the queue!')

                reject(error)
            } else if (!results[0]) {
                reject(new Error('Task not found in the queue!'))
            } else {
                resolve({
                    uuid: results[0].uuid,
                    user_id: results[0].user_id,
                    name: results[0].name,
                    status: 'queued',
                })
            }
        })
    })
}

function removeTaskFromDrafts(uuid) {
    return new Promise((resolve, reject) => {
        redisClient.del('task:' + uuid, (error, count) => {
            if (error) {
                reject(error)
            } else if (count === 0) {
                reject(new Error('Error deleting draft!'))
            } else {
                console.log('Draft is successfully deleted.')

                resolve()
            }
        })
    })
}

function putTaskIntoQueue(task) {
    return new Promise((resolve, reject) => {
        let CURRENT_TIMESTAMP = { toSqlString: () => 'CURRENT_TIMESTAMP()' }

        pool.query('INSERT INTO tasks SET ?', {
            uuid: task.uuid,
            user_id: task.user_id,
            name: task.name,
            consumed: 0,
            created_at: CURRENT_TIMESTAMP
        }, (error, results, fields) => {
            if (error) {
                console.log('Error putting the task into the queue!')

                reject(error)
            } else {
                console.log('Task is put into the queue.')

                resolve({
                    uuid: task.uuid,
                    user_id: task.user_id,
                    name: task.name,
                    status: 'queued',
                })
            }
        })
    })
}

exports.authenticate = authenticate
exports.createUser = createUser
exports.getTasks = getTasks
exports.createTask = createTask
exports.confirmTask = confirmTask
exports.getTask = getTask
