'use strict';
const Account = require('../models/account');
const Boom = require('boom');
const Joi = require('joi');
const NoteEntry = require('../models/note-entry');
const TodoEntry = require('../models/todo-entry');
const Preware = require('../preware');
const Status = require('../models/status');
const StatusEntry = require('../models/status-entry');
const User = require('../models/user');


const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/api/accounts',
        options: {
            tags: ['api','accounts'],
            description: 'Get a paginated list of all customer accounts. [Admin Scope]',
            notes: 'Get a paginated list of all customer accounts.',
            auth: {
                scope: 'admin'
            },
            validate: {
                query: {
                    sort: Joi.string().default('_id'),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            }
        },
        handler: async function (request, h) {

            const query = {};
            const limit = request.query.limit;
            const page = request.query.page;
            const options = {
                sort: Account.sortAdapter(request.query.sort)
            };

            return await Account.pagedFind(query, page, limit, options);
        }
    });


    server.route({
        method: 'GET',
        path: '/api/accounts/{id}',
        options: {
            tags: ['api','accounts'],
            description: 'Get a customer account by ID. [Admin Scope]',
            notes: 'Get a customer account by ID.',
            validate: {
                params: {
                    id : Joi.string().required().description('the id to get the account')
                }
            },
            auth: {
                scope: 'admin'
            }
        },
        handler: async function (request, h) {

            const account = await Account.findById(request.params.id);

            if (!account) {
                throw Boom.notFound('Account not found.');
            }

            return account;
        }
    });


    server.route({
        method: 'PUT',
        path: '/api/accounts/{id}',
        options: {
            tags: ['api','accounts'],
            description: 'Update a customer account by ID. [Admin Scope]',
            notes: 'Update a customer account by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    name: Joi.object({
                        first: Joi.string().required(),
                        middle: Joi.string().allow(''),
                        last: Joi.string().required()
                    }).required()
                },
                params: {
                    id : Joi.string().required().description('the id to update the account')
                }
            }
        },
        handler: async function (request, h) {

            const id = request.params.id;
            const update = {
                $set: {
                    name: request.payload.name
                }
            };
            const account = await Account.findByIdAndUpdate(id, update);

            if (!account) {
                throw Boom.notFound('Account not found.');
            }

            return account;
        }
    });


    server.route({
        method: 'DELETE',
        path: '/api/accounts/{id}',
        options: {
            tags: ['api','accounts'],
            description: 'Delete a customer account by ID. [Root Scope]',
            notes: 'Delete a customer account by ID.',
            validate: {
                params: {
                    id : Joi.string().required().description('the id to delete the account')
                }
            },
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const account = await Account.findByIdAndDelete(request.params.id);

            if (!account) {
                throw Boom.notFound('Account not found.');
            }

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'POST',
        path: '/api/accounts/{id}/todo',
        options: {
            tags: ['api','accounts'],
            description: 'Edit todo items for a user. [Admin Scope]',
            notes: 'Edit todo items for a user',
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    data: Joi.array().items(TodoEntry.schema).required().description('arrary of todo items')                 
                },
                params: {
                    id : Joi.string().required().description('the id to add a new note onto an account')
                }
            }
        },
        handler: async function (request, h) {

            const id = request.params.id;     
            
            const todoEntries = request.payload.data.map( item => new TodoEntry({
                description: item.description,
                fileUrl: item.fileUrl,
                isFinished: item.isFinished
            }))

            const update = {
                $set: {
                    todos: todoEntries
                }
            };
            const account = await Account.findByIdAndUpdate(id, update);

            if (!account) {
                throw Boom.notFound('Account not found.');
            }

            return account;
        }
    });


    server.route({
        method: 'POST',
        path: '/api/accounts/{id}/notes',
        options: {
            tags: ['api','accounts'],
            description: 'Add a new note on a customer account. [Admin Scope]',
            notes: 'Add a new note on a customer account.',
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    data: Joi.string().required()
                },
                params: {
                    id : Joi.string().required().description('the id to add a new note onto an account')
                }
            }
        },
        handler: async function (request, h) {

            const id = request.params.id;
            const admin = request.auth.credentials.roles.admin;
            const newNote = new NoteEntry({
                data: request.payload.data,
                adminCreated: {
                    id: `${admin._id}`,
                    name: admin.fullName()
                }
            });
            const update = {
                $push: {
                    notes: newNote
                }
            };
            const account = await Account.findByIdAndUpdate(id, update);

            if (!account) {
                throw Boom.notFound('Account not found.');
            }

            return account;
        }
    });


    server.route({
        method: 'POST',
        path: '/api/accounts/{id}/status',
        options: {
            tags: ['api','accounts'],
            description: 'Update customer account status by ID. [Admin Scope]',
            notes: 'Update customer account status by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    status: Joi.string().required()
                },
                params: {
                    id : Joi.string().required().description('the id to update an account status')
                }
            },
            pre: [{
                assign: 'status',
                method: async function (request, h) {

                    const status = await Status.findById(request.payload.status);

                    if (!status) {
                        throw Boom.notFound('Status not found.');
                    }

                    return status;
                }
            }]
        },
        handler: async function (request, h) {

            const id = request.params.id;
            const admin = request.auth.credentials.roles.admin;
            const newStatus = new StatusEntry({
                id: `${request.pre.status._id}`,
                name: request.pre.status.name,
                adminCreated: {
                    id: `${admin._id}`,
                    name: admin.fullName()
                }
            });
            const update = {
                $set: {
                    'status.current': newStatus
                },
                $push: {
                    'status.log': newStatus
                }
            };
            const account = await Account.findByIdAndUpdate(id, update);

            if (!account) {
                throw Boom.notFound('Account not found.');
            }

            return account;
        }
    });


    server.route({
        method: 'GET',
        path: '/api/accounts/my',
        options: {
            tags: ['api','accounts'],
            description: 'Get the logged-in user\'s account details. [User Account Scope]',
            notes: 'Get the logged-in user\'s account details.',
            auth: {
                scope: 'account'
            }
        },
        handler: async function (request, h) {

            const id = request.auth.credentials.roles.account._id;
            const fields = Account.fieldsAdapter('user name timeCreated');

            return await Account.findById(id, fields);
        }
    });


    server.route({
        method: 'PUT',
        path: '/api/accounts/my',
        options: {
            tags: ['api','accounts'],
            description: 'Update the logged-in user\'s account details. [User Account Scope]',
            notes: 'Update your account details.',
            auth: {
                scope: 'account'
            },
            validate: {
                payload: {
                    name: Joi.object({
                        first: Joi.string().required(),
                        middle: Joi.string().allow(''),
                        last: Joi.string().required()
                    }).required()
                }
            }
        },
        handler: async function (request, h) {

            const id = request.auth.credentials.roles.account._id;
            const update = {
                $set: {
                    name: request.payload.name
                }
            };
            const options = {
                fields: Account.fieldsAdapter('user name timeCreated')
            };

            return await Account.findByIdAndUpdate(id, update, options);
        }
    });
};


module.exports = {
    name: 'api-accounts',
    dependencies: [
        'auth',
        'hapi-auth-basic',
        'hapi-mongo-models'
    ],
    register
};
