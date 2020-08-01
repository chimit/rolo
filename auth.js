const storage = require('./storage')

async function auth(req, res, next) {
    req.user = await storage.authenticate(req.token)

    next()
}

module.exports = auth
