'use strict';
const Joi = require('joi');
const MongoModels = require('mongo-models');
const NewDate = require('joistick/new-date');


const schema = Joi.object({
    description: Joi.string().required(),
    fileUrl: Joi.string().allow('').optional(),
    isFinished: Joi.bool().default(false),
    lastModified: Joi.date().default(NewDate(), 'last modified time')
});


class TodoEntry extends MongoModels {}


TodoEntry.schema = schema;


module.exports = TodoEntry;
