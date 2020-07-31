const mysql = require('mysql')

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rolo_tasks'
})

function createUser(params) {
    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO users SET ?', params, (error, results, fields) => {
            if (error) {
                console.log('Error saving user!')
                
                reject(error)
            } else {
                console.log('User is saved!')

                resolve({ id: results.insertId, ...params });
            }
        })
    })
}

function createTask(params) {
    return new Promise((resolve, reject) => {
        let CURRENT_TIMESTAMP = { toSqlString: function () { return 'CURRENT_TIMESTAMP()'; } };
        
        connection.query('INSERT INTO tasks SET ?', { ...params, created_at: CURRENT_TIMESTAMP }, (error, results, fields) => {
            if (error) {
                console.log('Error saving task!')

                reject(error)
            } else {
                console.log('Task is saved!')

                resolve({ id: results.insertId, ...params });
            }
        })
    })
}

function confirmTask(taskId) {
    return new Promise((resolve, reject) => {
        connection.query('UPDATE tasks SET confirmed = ? WHERE id = ?', [1, taskId], (error, results, fields) => {
            if (error) {
                console.log('Error updating task!')

                reject(error)
            } else {
                console.log('Task is updated!')

                resolve({ id: results.insertId, ...params });
            }
        })
    })
}

exports.createUser = createUser
exports.createTask = createTask
exports.confirmTask = confirmTask
