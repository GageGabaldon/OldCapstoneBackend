const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const userService = require('./user.service');

// routes
router.post('/gettoken', gettokenSchema, gettoken);
router.post('/register', registerSchema, register);
router.post('/authenticate', authenticateSchema, authenticate)
router.get('/', authorize(), getAll);
router.get('/current', authorize(), getCurrent);
router.get('/:id', authorize(), getById);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

function gettokenSchema(req, res, next) {
    const schema = Joi.object({
        userEmail: Joi.string().required(),
        userKey: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function gettoken(req, res, next) {
    userService.gettoken(req.body)
        .then(user => res.json(user.userToken))
        .catch(next);
}

function registerSchema(req, res, next) {
    const schema = Joi.object({
		userName: Joi.string().required(),
		userPhone: Joi.string(),
        userEmail: Joi.string().required(),
        userKey: Joi.string().min(6).required()
    });
    validateRequest(req, next, schema);
}

function register(req, res, next) {
    userService.create(req.body)
        .then(() => res.json({ message: 'Registration successful' }))
        .catch(next);
}

function authenticateSchema(req, res, next) {
    const schema = Joi.object({
		userName: Joi.string(),
        userEmail: Joi.string().required(),
        userKey: Joi.string().required(),
        userToken: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
    userService.authenticate(req.body)
        .then(user => res.json("Approved"))
        .catch(next);
}

function getAll(req, res, next) {
    userService.getAll()
        .then(users => res.json(users))
        .catch(next);
}

function getCurrent(req, res, next) {
    res.json(req.user);
}

function getById(req, res, next) {
    userService.getById(req.params.id)
        .then(user => res.json(user))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        userEmail: Joi.string().empty(''),
        userKey: Joi.string().min(6).empty('')
    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    userService.update(req.params.id, req.body)
        .then(user => res.json(user))
        .catch(next);
}

function _delete(req, res, next) { 
    userService.delete(req.params.id)
        .then(() => res.json({ message: 'User deleted successfully' }))
        .catch(next);
}