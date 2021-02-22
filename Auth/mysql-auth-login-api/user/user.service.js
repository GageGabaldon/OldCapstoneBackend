const config = require('config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('_helpers/db');

module.exports = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ userEmail, userKey }) {
    const user = await db.User.scope('withHash').findOne({ where: { userEmail } });

    if (!user || !(await bcrypt.compare(userKey, user.userToken)))
        throw 'userEmail or userKey is incorrect';

    // authentication successful
    const userToken = jwt.sign({ sub: user.userID }, config.secret, { expiresIn: '7d' });
    return { ...omitHash(user.get()), userToken };
}

async function getAll() {
    return await db.User.findAll();
}

async function getById(id) {
    return await getUser(id);
}

async function create(params) {
    // validate
    if (await db.User.findOne({ where: { userEmail: params.userEmail } })) {
        throw 'User"' + params.userEmail + '" is already taken';
    }

    // hash password
    if (params.userKey) {
        params.userToken = await bcrypt.hash(params.userKey, 10);
    }

    // save user
    await db.User.create(params);
}

async function update(id, params) {
    const user = await getUser(id);

    // validate
    const userEmailChanged = params.userEmail && user.userEmail !== params.userEmail;
    if (userEmailChanged && await db.User.findOne({ where: { userEmail: params.userEmail } })) {
        throw 'User"' + params.userEmail + '" is already taken';
    }

    // hash password if it was entered
    if (params.userKey) {
        params.userToken = await bcrypt.hash(params.userKey, 10);
    }

    // copy params to user and save
    Object.assign(user, params);
    await user.save();

    return omitHash(user.get());
}

async function _delete(id) {
    const user = await getUser(id);
    await user.destroy();
}

// helper functions

async function getUser(id) {
    const user = await db.User.findByPk(id);
    if (!user) throw 'User not found';
    return user;
}

function omitHash(user) {
    const { userToken, ...userWithoutHash } = user;
    return userWithoutHash;
}