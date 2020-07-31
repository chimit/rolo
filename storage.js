const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql')
const redis = require('redis')

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rolo_tasks'
})

const redisClient = redis.createClient()

redisClient.on('error', function (err) {
    console.log('Error ' + err)
})

function createUser(params) {
    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO users SET ?', params, (error, results, fields) => {
            if (error) {
                console.log('Error saving user!')
                
                reject(error)
            } else {
                console.log('User is saved.')

                resolve({ id: results.insertId, ...params });
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
                    resolve({ uuid: uuid, ...params })
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

function getTaskFromDrafts(uuid) {
    return new Promise((resolve, reject) => {
        redisClient.hgetall('task:' + uuid, (error, value) => {
            if (error) {
                console.log(value)

                reject(error)
            } else if (!value) {
                reject(new Error('Draft not found!'))
            } else {
                resolve({ uuid, ...value })
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

        connection.query('INSERT INTO tasks SET ?', {
            ...task,
            created_at: CURRENT_TIMESTAMP
        }, (error, results, fields) => {
            if (error) {
                console.log('Error putting the task into the queue!')

                reject(error)
            } else {
                console.log('Task is put into the queue.')

                resolve({ id: results.insertId, ...task });
            }
        })
    })
}

exports.createUser = createUser
exports.createTask = createTask
exports.confirmTask = confirmTask
