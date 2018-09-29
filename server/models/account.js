'use strict';
const Assert = require('assert');
const Joi = require('joi');
const MongoModels = require('mongo-models');
const NewArray = require('joistick/new-array');
const NewDate = require('joistick/new-date');
const NoteEntry = require('./note-entry');
const StatusEntry = require('./status-entry');
const TodoEntry = require('./todo-entry');


const schema = Joi.object({
    _id: Joi.object(),
    maleName: Joi.string(),
    femaleName: Joi.string(),
    weddingDate: Joi.date(),
    mainLocation: Joi.string(),
    plan: Joi.string(),
    notes: Joi.array().items(NoteEntry.schema)
        .default(NewArray(), 'array of notes'),
    todos: Joi.array().items(TodoEntry.schema)
        .default(NewArray(), 'array of todo'),
    status: Joi.object({
        current: StatusEntry.schema,
        log: Joi.array().items(StatusEntry.schema)
            .default(NewArray(), 'array of statuses')
    }).default(),
    timeCreated: Joi.date().default(NewDate(), 'time of creation'),
    user: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().lowercase().required()
    })
});


class Account extends MongoModels {
    static async create() {

        const document = new this({});
        const accounts = await this.insertOne(document);

        return accounts[0];
    }

    static findByUsername(username) {

        Assert.ok(username, 'Missing username argument.');

        const query = { 'user.name': username.toLowerCase() };

        return this.findOne(query);
    }

    async linkUser(id, name) {

        Assert.ok(id, 'Missing id argument.');
        Assert.ok(name, 'Missing name argument.');

        const update = {
            $set: {
                user: { id, name }
            }
        };

        return await Account.findByIdAndUpdate(this._id, update);
    }
}

Account.collectionName = 'accounts';
Account.schema = schema;
Account.indexes = [
    { key: { 'user.id': 1 } },
    { key: { 'user.name': 1 } }
];


module.exports = Account;
